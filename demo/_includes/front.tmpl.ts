import { Helper, PageData } from 'lume/core.ts'

export default ({ content, title }: PageData) => /*html*/ `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
        </head>
        <body>
            <ftl msg='greeting' var-name='Tú' var-gender='male'></ftl>
            <ftl msg='heading' tag='h1' var-ctx='front'></ftl>
            <ftl msg='greeting' var-name='Tú' var-gender='other'></ftl>
            <ftl msg='missing'>missing translation</ftl>
            <ftl tag=span class='ok'>forgetful msg key</ftl>
            ${content}
        </body>
    </html>
`
