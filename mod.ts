import { MultiProcessor, Page, PageData, Plugin, Processor, Site } from 'lume/core.ts'
import text_loader from 'lume/core/loaders/text.ts'
import { merge } from 'lume/core/utils.ts'

import { resolve } from 'lume/deps/path.ts'
import { Element } from 'lume/deps/dom.ts'

import {
   FluentBundle,
   FluentFunction,
   FluentResource,
   FluentValue,
   FluentVariable,
} from 'npm/fluent'

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

export default function (user?: Partial<Options>): Plugin {
   const opt = merge(fallback, user) as Options

   return (site: Site) => {
      const manager = new FluentManager(site, opt)
      const { prepare_translation, inline_translation } = prepare_fluent(manager, site, opt)

      site.preprocessAll(opt.extensions, prepare_translation)
      site.process(opt.extensions, inline_translation)
   }
}

function prepare_fluent(manager: FluentManager, site: Site, opt: Options) {
   const fluent_tag = opt.fluentTag!

   const rm_duplicate_locales = (ls: string[], p: Page<PageData>) => {
      if (!p.data.lang) return ls
      if (Array.isArray(p.data.lang)) return ls

      ls.includes(p.data.lang) || ls.push(p.data.lang)
      return ls
   }

   const prepare_translation: MultiProcessor = async (pages) => {
      const base_path = resolve(site.options.src, opt.includes || site.options.includes)
      const real_path = await Deno.lstat(base_path).then(
         (entry) => entry.isSymlink ? Deno.realPath(base_path) : base_path,
      )
      const locale_list = pages.reduce(rm_duplicate_locales, [])
      await manager.load_locale(locale_list, real_path)
   }

   const inline_translation: Processor = (page) => {
      if (!page.data.lang || Array.isArray(page.data.lang)) {
         return void site.logger.warn(
            'The Fluent plugin must be installed after MultiLanguage plugin!',
         )
      }

      manager.set_current_locale(page.data.lang as string)
      page.document!.querySelectorAll(fluent_tag).forEach(
         (placeholder, inx) =>
            manager.replace_tag(placeholder as Element, inx, page.data.layout || 'unknown'),
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
            await this.#scan_ftl(path, regex_locale, deep_lv++)
            continue
         }

         const [is_ftl_file, _domain, locale] = path.match(regex_locale) ?? []
         if (!is_ftl_file) continue

         const content = await this.#site.getContent(path, text_loader)
         if (!content) continue

         const txt = content as unknown as string
         this.#locales.get(locale)!.addResource(new FluentResource(txt))
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
      error_log.forEach((err) =>
         this.#site.logger.warn(err.message, { name: err.name, cause: err })
      )

      return formatted_msg
   }

   replace_tag(el: Element, inx: number, layout: string) {
      if (!this.#current_locale) return void 0

      const msg_id = el.getAttribute('msg')
      const fallback_msg = el.textContent
      const msg = this.get_msg(msg_id, {
         fallback: fallback_msg,
         data: extract_ftl_var(el),
      })
      if (!msg_id) {
         this.#site.logger.log(
            `Element ${el.nodeName}[${inx}] (in ${layout}) requires 'msg' attribute!`,
         )
      }

      console.log(msg_id)
      if (msg_id && !msg || msg === fallback_msg) {
         const log_head = `${layout}:${this.#current_locale}[${inx}]`
         this.#site.logger.log(
            `${log_head} Message '${msg_id}' not found and no fallback to replace!`,
         )
      }

      const tag = el.getAttribute('tag')
      const new_el = tag ? new_element(tag, msg, el) : msg

      // @WARN deno-dom doesn't support nonstandard void element atm
      el.replaceWith(new_el)
   }
}

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

export type FluentMsgVar = Record<string, FluentVariable>

export type { FluentFunction, FluentValue, FluentVariable }
