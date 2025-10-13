# @maitre-d/module-kitchen

CLI to scaffold modules from recipe archives hosted as GitHub releases.

## Requirements

- Node.js >= 18 (for built-in `fetch`).
- Network access to GitHub (or set `GITHUB_TOKEN` environment variable for private repos).

## Installation & Usage

You can run the CLI with `npx`:

```bash
npx @maitre-d/create-module myFeature --recipe typescript --version latest
```

Or interactively (omit args):

```bash
npx @maitre-d/create-module
```

## Flags

- `--recipe <recipe>` : Choose the recipe name (e.g. `typescript`, `esm`).
- `--dir <targetDir>` : Override the target directory where the module will be created.
- `--version <version|latest>` : Select the template version to use. Use `latest` to auto-select the newest release (or leave unspecified and choose interactively).

## Behavior

1. The CLI detects whether your current directory is the `@maitre-d/core` root by reading `package.json` and checking the `name` field.
   - If in `@maitre-d/core`, default target directory is `modules/<moduleName>`.
   - Otherwise default is `./<moduleName>`.
2. If any parameters are missing, the CLI prompts interactively:
   - Module name
   - Recipe
   - If version is not provided, the CLI will query the GitHub Releases API and present available versions for selection (including the latest).
   - Target directory
3. If all parameters were provided via CLI (name, recipe, dir, version), a summary confirmation is shown before proceeding.
4. The CLI uses the GitHub Releases API to find the release asset matching the chosen recipe and version. It downloads the corresponding tarball and extracts it into the target directory, then updates `manifest.json` with `load = true`.

## Examples

Download the latest typescript recipe into modules/myFeature (when inside @maitre-d/core):

```bash
npx @maitre-d/create-module myFeature --recipe typescript --version latest
```

Download a specific version:

```bash
npx @maitre-d/create-module myFeature --recipe typescript --version 1.2.0
```

## Notes

- If the GitHub repository is private or to increase API rate limits, set the `GITHUB_TOKEN` environment variable.
- The CLI is implemented in ESM and intended for Node.js >= 18.
