import { Data } from 'lume/core/file.ts'

export default ({ content, title }: Data) => /*html*/ `
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
            <ftl tag=span class='no'>forgetful msg key</ftl>
            <ftl msg='lvl4' tag=span class='no'>can't get it out because this message was hid too deep! Max deep is level-3</ftl>
            <ftl msg='same-file-name-diff-msg' tag=span class='ok'></ftl>
            <ftl msg='bye'></ftl>
            ${content}
        </body>
    </html>
`
