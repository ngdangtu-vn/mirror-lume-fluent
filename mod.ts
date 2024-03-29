import {
   Element,
   FluentBundle,
   FluentFunction,
   FluentResource,
   FluentValue,
   FluentVariable,
   log,
   merge,
   Page,
   Plugin,
   Processor,
   resolve,
   Site,
   text_loader,
} from './deps.ts'

export interface Options {
   /** Element HTML Tag Name like <ftl></ftl> */
   fluentTag?: string

   /** Display fallback language if the current language is not available */
   fallbackLanguage: string

   /** Fluent custom functions */
   fn?: Record<string, FluentFunction>

   /**
    * Custom includes paths
    * @default `site.options.includes`
    */
   includes?: string

   /** The list of output extensions used for this plugin */
   extensions: string[]
}

export const fallback: Options = {
   fluentTag: 'ftl',
   fallbackLanguage: 'en',
   extensions: ['.html'],
}

/**
 * A plugin that enables localization for Lume Multilanguage plugin
 * (Yes, it is an extension for plugin)
 */
export default function (user?: Partial<Options>): Plugin {
   const opt = merge(fallback, user) as Options

   return (site: Site) => {
      const manager = new FluentManager(site, opt)
      const { prepare_translation, inline_translation } = prepare_fluent(manager, site, opt)

      site.preprocess(opt.extensions, prepare_translation)
      site.process(
         opt.extensions,
         (filtered_page_ls) => filtered_page_ls.forEach(inline_translation),
      )
   }
}

function prepare_fluent(manager: FluentManager, site: Site, opt: Options) {
   const fluent_tag = opt.fluentTag!

   const rm_duplicate_locales = (ls: string[], p: Page) => {
      if (!p.data.lang) return ls
      if (Array.isArray(p.data.lang)) return ls

      ls.includes(p.data.lang) || ls.push(p.data.lang)
      return ls
   }

   const prepare_translation: Processor = async (filtered_page_ls) => {
      const basepath = resolve(
         site.options.cwd,
         site.options.src,
         opt.includes || site.options.includes,
      )
      const real_path = await Deno.lstat(basepath).then(
         (entry) => entry.isSymlink ? Deno.realPath(basepath) : basepath,
      )
      const locale_list = filtered_page_ls.reduce(rm_duplicate_locales, [])
      await manager.load_locale(locale_list, real_path)
   }

   const inline_translation = (filtered_page: Page) => {
      if (!filtered_page.data.lang || Array.isArray(filtered_page.data.lang)) {
         return void log.warn(
            'The Fluent plugin must be installed after MultiLanguage plugin!',
         )
      }

      manager.set_current_locale(filtered_page.data.lang as string)
      filtered_page.document!.querySelectorAll(fluent_tag).forEach(
         (placeholder, inx) =>
            manager.replace_tag(placeholder as unknown as Element, inx, filtered_page),
      )
   }

   return { prepare_translation, inline_translation }
}

class FluentManager {
   #site: Site
   #max_depth = 3

   #current_locale?: string
   #locales: Map<string, FluentBundle>
   #fallback_locale: string
   #fn_list?: Record<string, FluentFunction>

   constructor(site: Site, opt: Options) {
      this.#site = site

      this.#locales = new Map()
      this.#fallback_locale = opt.fallbackLanguage
      this.#fn_list = opt.fn
   }

   async #realpath(is_symlink: boolean, path_segments: string[]) {
      const path = resolve(...path_segments)
      return is_symlink ? await Deno.realPath(path) : path
   }

   async #scan_ftl(base: string, regex_locale: RegExp, deep_lv = 0) {
      if (deep_lv > this.#max_depth) return void 0 // FAILSAFE from infinitive recursion

      for await (const entry of Deno.readDir(base)) {
         const path = await this.#realpath(entry.isSymlink, [base, entry.name])

         if (entry.isDirectory) {
            await this.#scan_ftl(path, regex_locale, ++deep_lv)
            continue
         }

         const [is_ftl_file, _domain, locale] = path.match(regex_locale) ?? []
         if (!is_ftl_file) continue

         const content = await this.#site.getContent(path, text_loader)
         if (!content) continue

         const res = new FluentResource(content as unknown as string)
         this.#locales.get(locale)!.addResource(res)
      }
   }

   async load_locale(locale_list: string[], base_path: string) {
      if (locale_list.length < 1) return this

      for (const locale of locale_list) {
         this.#locales.set(
            locale,
            // @TODO
            new FluentBundle(locale, { useIsolating: false, functions: this.#fn_list }), // should I disable invisible characters?
            // new FluentBundle(locale, { useIsolating: true, functions: this.#fn_list }),
         )
      }

      const regex_locale = new RegExp(`([-\.\+\w\s]+\.)*(${locale_list.join('|')}).ftl$`, 'i')
      await this.#scan_ftl(base_path, regex_locale)

      return this
   }

   set_current_locale(locale: string) {
      this.#current_locale = locale
   }

   get_msg(
      id: string | null,
      info: { fallback?: string; data?: FluentMsgVar } = {
         fallback: '',
         data: undefined,
      },
   ) {
      const fallback_msg = info.fallback || ''
      if (!id) return fallback_msg

      const bundle = this.#locales.get(this.#current_locale || this.#fallback_locale)
      if (!bundle) return fallback_msg

      const msg = bundle.hasMessage(id)
         ? bundle.getMessage(id)!
         : this.#locales.get(this.#fallback_locale)?.getMessage(id)
      if (!msg?.value) return fallback_msg

      const error_log: Error[] = []
      const formatted_msg = bundle.formatPattern(msg.value, info.data, error_log)
      error_log.forEach((err) => log.warn(err.message, { name: err.name, cause: err }))

      return formatted_msg
   }

   #log_head(pg: Page, holder_name: string) {
      const src_path = pg.src.entry!.path
      const layout = `${this.#site.options.includes}/${pg.data.layout}`
      const locale = this.#current_locale || '??'
      return `😱 <yellow>${holder_name}</yellow> ${layout} <dim>${locale} » ${src_path}</dim>`
   }

   replace_tag(el: Element, inx: number, pg: Page) {
      if (!this.#current_locale) return void 0
      const msg_ls = []

      const msg_id = el.getAttribute('msg')
      const fallback_msg = el.textContent
      const msg = this.get_msg(msg_id, {
         fallback: fallback_msg,
         data: extract_ftl_var(el),
      })

      !msg_id && msg_ls.push(`<dim>The element requires 'msg' attribute.</dim>`)

      !msg && msg === fallback_msg &&
         msg_ls.push(`<dim>The message not found and no fallback to replace.</dim>`)

      const tag = el.getAttribute('tag')
      const new_el = tag ? new_element(tag, msg, el) : msg

      // @WARN deno-dom doesn't support nonstandard void element atm!
      el.replaceWith(new_el)

      if (msg_ls.length > 0) {
         const err_msg = [this.#log_head(pg, `${el.nodeName}[${msg_id || inx}]`), ...msg_ls]
            .join('\n   <dim>↳</dim> ')
         log.error(err_msg)
      }
   }
}

type FluentMsgVar = Record<string, FluentVariable>

function extract_ftl_var(el: Element): FluentMsgVar {
   const data_list: FluentMsgVar = {}

   el.getAttributeNames()
      .filter((name) => name.match(/^var-.*/i))
      .forEach(
         (name) => data_list[name.slice(4)] = el.getAttribute(name)!,
      )

   return data_list
}

function migrate_attr(old_el: Element, new_el: Element) {
   const rm_fluent_var = (name: string) => {
      if (['msg', 'tag'].includes(name)) return false
      return !name.match(/^var-.*/i)
   }
   const set_attr = (name: string) => {
      const val = old_el.getAttribute(name)!
      new_el.setAttribute(name, val)
   }
   old_el.getAttributeNames().filter(rm_fluent_var).forEach(set_attr)
}

function new_element(tag: string, content: string, old_el: Element) {
   if (!content) return ''

   const el = old_el.ownerDocument!.createElement(tag)
   el.textContent = content
   migrate_attr(old_el, el)

   return el
}

export type { FluentFunction, FluentValue, FluentVariable }
