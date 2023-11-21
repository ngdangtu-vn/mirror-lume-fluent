import { Helper, PageData } from 'lume/core.ts'

export default ({ content, title }: PageData) => /*html*/ `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
        </head>
        <body><ftl msg='heading' tag='h1' var-ctx='${title}'></ftl>${content}</body>
    </html>
`
