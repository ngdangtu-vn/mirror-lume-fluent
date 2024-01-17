import { Data } from 'lume/core/file.ts'

export default ({ content, title }: Data) => /*html*/ `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
        </head>
        <body><ftl msg='heading' tag='h1' var-ctx='${title}'></ftl>${content}</body>
    </html>
`
