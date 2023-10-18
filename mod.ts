import { Page, Plugin, Site } from 'lume/core.ts'
import { FluentBundle, FluentResource } from 'npm-fluent'

export interface Options {
   extensions: string[]
}

export const fallback: Options = {
   extensions: ['ftl'],
}

export default function (opt: Partial<Options>): Plugin {
   //

   return (site: Site) => {
      //
   }
}

class FluentPlugin {
   //
}
