/**
 * An excerpt code with modified from Lume test code
 * @src //github.com/lumeland/lume/tests/utils.ts
 */

import lume from 'lume/mod.ts'
import { DeepPartial, fromFileUrl, join, Site, SiteOptions } from '../deps.ts'

/** Create a new lume site using the "assets" path as cwd */
export function getSite(
   options: DeepPartial<SiteOptions> = {},
   pluginOptions = {},
): Site {
   options.cwd = join(fromFileUrl(import.meta.resolve('../')), 'demo')
   return lume(options, pluginOptions, false)
}
