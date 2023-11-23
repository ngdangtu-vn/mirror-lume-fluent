# Fluent for Lume

A [Fluent](https://projectfluent.org) wrapper to help you easily build multilingual site with
[Lume](https://lume.land).

## Requirement

The plugin must be installed **AFTER** the official plugin, `multilanguage`.

## Installation

```TypeScript
// _config.ts of Lume

import lume from 'lume/mod.ts'
import multilanguage from 'lume/plugins/multilanguage.ts'
import fluent from 'https://deno.land/x/lume_fluent/mod.ts'

const site = lume()

site.use(multilanguage())
site.use(fluent(/* Options */))

export default site
```

### Options

(This section only for stable release; to get the latest options, look for `Options` interface in
[`mod.ts`](./mod.ts) file)

<!-- deno-fmt-ignore -->
> - `optionName` **type** (default value)
>   - option description

- `fluentTag` **string** ("ftl")
  - The plugin can use any nonstandard HTML tag name as a placeholder element.
  - Default is: `<ftl></ftl>`
- `fallbackLanguage` **string** ("en")
  - The language to get a message if the current language doesn't have the message. Learn more in
    [Fallback Order](#fallback-order)
- `fn` **Record<string, [FluentFunction]>** (undefined)
  - You can pass your custom function to Fluent file and use it like built-in functions
- `includes` **string** (site.options.includes)
  - Mark Fluent translation file location
  - By default, plugin will search for translation in `site.options.includes`
- ~~`extensions` **string[]** ([".html"])~~
  - For now, please ignore

## Usage

### Fluent Tag Attributes

If attribute 'tag' is set, all the attributes will be kept in the new element except these
attributes:

1. `msg` = id (required)
2. `tag` = standard-HTML-tag-name
3. `var-*` = [FluentVariable]

### Fallback Order

The order for displaying message is from 1 to 4. Start from number 1:

1. Current Language
2. Fallback Language
3. Message Inside Fluent Tag
4. an Empty String

**Example**:

If you have:

- Fallback language is `en`
- 2 Fluent files `vi.ftl`, `en.ftl`
  - `vi.ftl` may have `awesome-msg` with content "Thông điệp sâu sắc"
  - `en.ftl` may have `awesome-msg` with content "A thoughtful message"
- A layout has 1 Fluent tag
  - `<ftl msg='awesome-msg'>Message Inside Fluent Tag</ftl>`.

Here is a several cases:

1. Current file is in `vi` & `awesome-msg` in `vi` is available.
   - Result: "Thông điệp sâu sắc"
2. Current file is in `vi` & `awesome-msg` in `vi` is not available but `en` does.
   - Result: "A thoughtful message"
3. Current file is in `vi` & no language has `awesome-msg` message key.
   - Result: "Message Inside Fluent Tag"
4. Current file is in `vi` & no language has `awesome-msg` message key. Even worse, the "Message
   Inside Fluent Tag" is not set, Fluent tag is now an empty tag:
   - Result: ""

## Known Issues

[ `P` problem | `E` explanation ]

`P` The translation tag (`<ftl>`) in void element form is not working.\
`E` This was more like upstream problem. In browser DOM parse, only a certain tag name is treated as
void element. The rest (standard & nonstandard) will be automatically wrapped, see
[deno-dom#154](https://github.com/b-fuze/deno-dom/issues/154). Because of that, any attempt to use
Fluent tag as void element `<ftl />` will end up loosing all the content below the tag during
replacing process. So for now, even I really want to support void element, there is nothing I can
do.

## TODO

- [ ] improve demo directory
- [ ] add testcases
- [ ] research on usecase of `extensions` option, it was meant to support `XSLT` but I don't know
      how far I can push.
- [ ] collect data & usage cases on FluentBundle Isolating mode (generate invisible character)

## More...

- [Example](./demo/_config.ts)
- [References & Credit](./doc/ref-n-ncredit.md)
- [Self Note](./doc/ref-n-ncredit.md)

[FluentVariable]: https://projectfluent.org/fluent.js/bundle/types/FluentVariable.html
[FluentFunction]: https://projectfluent.org/fluent.js/bundle/types/FluentFunction.html
