import lume from 'lume/mod.ts'
import multilanguage from 'lume/plugins/multilanguage.ts'
import fluent from '../mod.ts'

const site = lume()

site.use(multilanguage({ languages: ['vi', 'en'] }))
site.use(fluent({ includes: '_i18n' }))

export default site
