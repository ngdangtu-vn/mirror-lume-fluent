import { getSite } from './helper.ts'

import fluent from '../mod.ts'
import multilanguage from 'lume/plugins/multilanguage.ts'
import { assertSiteSnapshot, build } from './helper-core.ts'

Deno.test('Fluent', async (t) => {
   const site = getSite({
      location: new URL('https://example.com/'),
   })

   site.use(multilanguage({ languages: ['vi', 'en'] }))
   site.use(fluent({ includes: '_i18n' }))

   await build(site)
   await assertSiteSnapshot(t, site)
})
