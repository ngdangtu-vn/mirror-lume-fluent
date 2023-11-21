# My Self-Note

To bring this plugin on Deno Third Module repo, we (which past me & future me) must put our code in
Github. Todo so, make a mirror repo and constantly do mirror push. That's pain in the ass.
Therefore, git hook is used. So me in the future, DO NOT forget to run this command after clone
repo.

```sh
git config --local core.hooksPath .repo/
```

- `pre-push` will automatically do mirror push (or add a mirror remote if not available) on pushing
  commits to main remote server.

## Deployment Note

**TL;DR**

Use the command below to publish plugin (can be 1 in 3 stages)

```shell
git tag -a 1.0.0-alpha -m "Very first pilot version of Lume Fluent plugin"
```

See: https://git-scm.com/book/en/v2/Git-Basics-Tagging

## Version Semantic

Here is a convention for this plugin.

```
major.feature.fix-stage-flag
```

- **major**
  - Because this is plugin, this number will change to corresponding version of the main app, which
    is Lume in this case.
- **feature**
  - If the version offer new features (can also be understand as breaking changes)
- **fix**
  - A bug fix version
- **stage-flag** includes 3 stages (2 flags). The flags mostly used in **major** & **feature**
  version.
  - `alpha` a feature without test case → mostly for show off my work
  - `beta` a feature with test case → community testing
  - release stage means: ready to use with minimum bugs. This stage doesn't have flag.

**Examples**:

- `1.0.0` very first stable release
- `1.0.0-alpha` plugin in an early stage and lots of change could be made
- `1.0.0-alpha1` plugin refuses to leave it mommy and definitely some new changes are made
- `1.0.0-alpha2` the plugin creator literally has no idea what to do so please be gentle on him
- `1.0.0-alpha3` at this stage, the dev who made this must be receiving heavily Emotional Damage
- `1.0.0-alphaN` beyond this number and you probably... never gonna give you up♪ never gonna let you
  down♪ never gonna run around and desert you :3
