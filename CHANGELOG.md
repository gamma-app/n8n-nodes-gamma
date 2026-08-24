# Changelog

All notable changes to `@gammatech/n8n-nodes-gamma`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Prepares the package for a provenance-signed publish and for submission to the
n8n Creator Portal. No change to what any operation does.

### Added

- `publish.yml` now publishes with `npm publish --provenance`, from a version
  tag, with `id-token: write`. n8n requires provenance for verified community
  nodes; every release up to 0.1.4 was published without it.
- `usableAsTool: true` on the node, so it can be used as an AI agent tool.
- Icon on the `Gamma API` credential (`credentials/icons/gamma.svg`), and a gulp
  task to copy credential icons into `dist`.
- `engines.node` (`>=22.22`), matching n8n's own requirement.
- `docs/n8n-publishing.md` (release and verification reference) and
  `docs/n8n-readiness-audit.md` (current state against it).
- `npm test` (`test/presend.js`): exercises all 21 `preSend` hooks, asserts the
  request body composes correctly, and fails if any hook reverts to a bare
  parameter name.

### Added

- `npm run sync:enums` (`scripts/sync-api-enums.mjs`) regenerates
  `nodes/Gamma/apiEnums.ts` from Gamma's published API docs, cross-checking the
  OpenAPI schema against the human reference tables. `npm run sync:enums:check`
  fails when the committed output is stale, and CI runs it daily so a new image
  model or language surfaces as a red build.
- `.github/workflows/ci.yml`: build, lint and test on push/PR plus the daily
  drift check. The repo previously had no CI beyond publishing.
- `examples/one-card-per-item.json`: the one-card-per-row recipe —
  join with `\n---\n`, `textMode: preserve`, `cardSplit: inputTextBreaks`.
- `test/examples.js` validates every example workflow against the node's real
  schema: node type, parameter nesting, and enum values.
- `docs/n8n-integration-plan.md`: the full API-coverage review and roadmap.

### Fixed

- **Optional parameters no longer throw.** Every `preSend` hook on a parameter
  inside a collection asked `getNodeParameter` for a bare name
  (`'tone'`) when n8n resolves those by full path (`'additionalOptions.tone'`) —
  n8n calls `preSend` with the node-level context and looks the name up with
  lodash `get` on `node.parameters`. 20 of 21 hooks raised
  `Could not get parameter "<name>"` as soon as the user set that option, so the
  node only worked with no optional parameters at all. All calls are now fully
  qualified, confirmed against how n8n actually persists the node:
  `{ additionalOptions: { audience: "..." } }`.

- **`Image Source` offered `unsplash`, which the API does not accept.** Replaced
  with the documented enum, which also adds the previously missing `pexels` and
  `themeAccent`.
- **`Language` offered `Other (Enter Code)`, which sent the literal string
  `other`** — not a valid language code. Removed; the full list of 67 documented
  languages is now offered instead of 18.
- **`Folder IDs` invited a comma-separated list, but the API accepts at most
  one folder.** Now a single `Folder` field, and supplying more than one raises a
  clear error instead of sending a request that cannot succeed.
- **Card dimensions could be set to values invalid for the chosen format** (for
  example `1x1` on a presentation), which the API silently overrides. The node
  now offers only the ratios valid for the selected format.
- **The credential test called `GET /v1.0/me`, an endpoint Gamma does not
  document.** Now tests against `GET /v1.0/themes`. (The `User` resource still
  targets `/me` — see the readiness audit; it needs one call with a real key to
  confirm whether that endpoint exists at all.)
- `Export As` was missing `png`.
- Image models: 11 hardcoded entries with credit costs baked into the labels →
  the 40 documented image models, generated, with cost shown as option subtext.
  The 6 video-only model values the API also accepts are deliberately excluded.
- **The gulp 4 → 5 upgrade silently corrupted the PNG icon.** Gulp 5 reads files
  as utf8 by default, turning the 60x60 PNG into 7KB of mojibake in `dist`
  (SVG, being text, was unaffected). Icon tasks now pass `encoding: false`, and
  `npm test` asserts the built icons are byte-identical to their sources and
  that the PNG is a valid 60x60 image.
- `examples/auto-polling-workflow.json` used the node type
  `n8n-nodes-base.gamma`, which n8n cannot resolve for a community package, and
  set `numCards` at the top level where the node never reads it. Both corrected.

### Changed

- Linting moved from the retired `eslint-plugin-n8n-nodes-base` config to n8n's
  current linter via `@n8n/node-cli` (`npm run lint`, `npm run lint:fix`). The
  old config passed while hiding 48 violations.
- Stayed on **npm**, abandoning the uncommitted pnpm migration. `pnpm publish`
  has no `--provenance` flag, and n8n's starter, docs, and CLI are all
  npm-shaped. `package-lock.json` is now tracked, as `npm ci` requires.
- Node parameter display names are now Title Case, and dropdown options are
  alphabetised, per the n8n node linter. **This reorders several dropdowns**
  (AI Image Model, Card Dimensions, Language, Image Source, Workspace Access,
  External Access) and the Additional Options collection. Stored workflows are
  unaffected — the underlying `value`s did not change.
- `Number of items per page (max 200)` is now `Max number of results to return`
  on both Limit parameters, as the linter requires.
- Request-body construction is typed with `IDataObject` instead of `any`.
- **`Number of Cards` is now hidden when `Card Split` is `Input Text Breaks`**,
  and suppressed from the request even if a stale value remains. Gamma ignores
  `numCards` in that mode, so showing it implied a control that did nothing —
  the reported source of customer confusion.
- `Card Split` options now state the trade-off: `Auto` honours Number of Cards
  and ignores separators; `Input Text Breaks` splits on `---`, ignores Number of
  Cards, and yields a single card when the text has no separator.
- `Input Text` gained a hint explaining that joining array items with
  `\n---\n` produces one card per item.
- `Text Mode: Preserve` now explains *when* to use it (content that must not be
  reworded: dosages, legal terms, contract clauses) rather than restating the
  mechanism.
- An invalid `Header/Footer Config (JSON)` value now throws
  `NodeOperationError` with a fix-it description, instead of a bare `Error`.
- Codex `node` identifier corrected from `n8n-nodes-base.Gamma` to the package
  name; categories corrected to values n8n recognises (`Marketing & Content`,
  `Productivity`) — `AI` and `Content Creation` are not n8n categories.
- `.nvmrc` moved to Node 24 (Active LTS) from 22, and CI now reads `.nvmrc`
  instead of pinning Node 18, which was below n8n's minimum. Regenerate
  `package-lock.json` under Node 24 — a lockfile written by npm 10 (Node 22) is
  rejected by npm 11.
- `package.json` version realigned to `0.1.4` to match the npm registry.

- Dependencies refreshed: `prettier` 3.3.2 -> 3.9.6, `gulp` 4.0.2 -> 5.0.1.
  Dev install went from 857 to 628 packages and `npm audit` from 24
  vulnerabilities to 13. `typescript` is held at `^5.9.3` and `n8n-workflow`
  stays an unpinned peer — see `docs/n8n-publishing.md` §1.9 for why neither
  should be "updated".

### Removed

- `main: index.js` — the file did not exist and was not in `files`.
- Unused devDependencies: `@devlikeapro/n8n-openapi-node`, `js-yaml`,
  `eslint-plugin-n8n-nodes-base`, `@typescript-eslint/*`, `eslint`.
- `pnpm-lock.yaml` and `pnpm-workspace.yaml`, along with the `packageManager`
  field.

## [0.1.4] and earlier

Published from a local machine without provenance, so these versions cannot be
submitted for n8n verification. See `docs/n8n-readiness-audit.md`.
