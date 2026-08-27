# Changelog

All notable changes to `@gammatech/n8n-nodes-gamma`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2026-08-27

### Changed

- Package author email is now `adam.harris@gamma.app` rather than the shared
  `support@gamma.app` inbox, so npm and n8n point at a maintainer who can act on
  the mail. Metadata only — no code or behaviour changes.

## [0.5.0] - 2026-08-26

Four new resources and a structural refactor. The node now covers most of the
Gamma API rather than generation alone: standalone images, comment threads,
engagement analytics, and multi-page files published as Gamma sites.

Backward compatible — everything here is additive. The one structural change,
splitting the node into per-resource modules, leaves the built node description
byte-identical.

### Changed

- **`nodes/Gamma/` split into modules**, following the structure n8n uses for its
  own large nodes (Airtable v2). `Gamma.node.ts` goes from 1,556 lines to 39: a
  shell that imports assembled properties and the `listSearch` methods. Each
  resource now lives under `actions/<resource>/`, with one file per operation
  that has parameters of its own.

  This is a pure reorganisation. The built node description is **byte-identical**
  before and after — verified by serialising it (including function bodies) and
  diffing — so nothing n8n sees has changed.

  `additionalOptions` deliberately stays in one file. n8n's linter enforces
  alphabetical ordering of a collection's members, and assembling them from
  several modules would move that ordering out of reach of the static check.

### Added

- **Image resource** — generate a standalone on-brand image from a prompt,
  without creating a Gamma. **Create**, **Get Status** and **Archive Media**,
  covering `POST /images`, `GET /images/{id}` and the media-archive endpoint.

  Options match the API exactly: four image types, five size presets, an
  optional Theme (reusing the same picker as the Generation resource), and
  reference images as repeatable URL + role rows. The reference-image
  description states the thing that surprises people — supplying references
  makes Gamma skip a curated style and any theme, which it reports back as a
  warning.

- **Multi-page generation** — a `Create Multi-Page` operation building a file of
  up to 50 pages in one request, optionally published as a Gamma site.

  It is a **separate operation rather than an option on Create**, because the API
  is explicit that a request supplies *either* `inputText` *or* a `pages` array.
  Offering `pages` alongside a required `inputText` would mean a required field
  that is silently ignored — the same trap as `numCards` under
  `inputTextBreaks`.

  Pages can be supplied as **JSON** (the default, and what you want when
  building pages from upstream items) or **filled in by hand** for a handful.
  Both paths share one validation step, so they fail identically: not an array,
  empty, over 50, a non-object entry, or a page missing `inputText` each raise a
  specific error rather than a 400 from the API.

  The options `pages` overrides — text mode, number of cards, format, card
  split, and the text and image option groups — are **hidden for this
  operation**, since the API ignores them. File-level options (theme, folder,
  card dimensions, sharing, export, title) stay, because they still apply.

- **Comment resource** — read comment threads on a Gamma, with cursor paging,
  `includeArchived`, and **`updatedSince`**. That last one is what makes the
  endpoint worth having in n8n: a scheduled workflow can poll for what changed
  rather than re-reading every thread.

- **Analytics resource** — all four endpoints: document totals, per-card
  engagement, a paginated viewer list, and one viewer's per-card detail.

  Permissions shape the answer rather than merely gating it: every response
  carries a `scope` of `all` or `self`, so an API key with only `edit`
  permission gets its own row back rather than the workspace's. The operation
  and parameter descriptions say so, because otherwise a thin response reads as
  a bug.

- **`Simplify` on Get Document analytics and Get Many comments.** Neither
  response exceeds the guideline's 10-field threshold, but both carry one field
  that dominates the payload — a 30-entry `dailyViews` array, and `targetHtml`
  plus nested `replies`. Simplify drops those, collapsing replies to a count.

- `test/structure.test.js` guards the risk the split introduces: that a
  mis-ordered import scatters one resource's parameters through another's. It
  asserts each resource occupies one contiguous run, every resource in the
  selector has exactly one operation parameter, and every picker references a
  `listSearch` method that exists.

## [0.4.0] - 2026-08-25

The node can now work with Gammas that already exist, not only create new ones.
Export is the headline: a Gamma could previously only be exported at generation
time, so re-exporting an existing deck was impossible.

### Added

- **Gamma resource** — work with an existing Gamma rather than only creating
  one: **Get** (metadata), **Export** (to PDF, PNG or PPTX), **Archive** and
  **Delete**. Export is the capability people asked for most: previously a Gamma
  could only be exported at generation time via `exportAs`.
- **Export resource** with **Get Status**, to poll an export the same way
  generations are polled.
- **Title** on Create, so a generated Gamma can be named deterministically
  instead of relying on one derived from the content.
- **Simplify** on Get Gamma. That response returns 11 fields, which is the first
  time in this node the guideline's 10-field threshold has actually been
  crossed. It reduces to 8 and flattens the nested author to `authorName`.
- `scripts/changelog-section.mjs`, and `publish.yml` now creates a GitHub
  Release from the matching changelog section. The repo previously had no
  Releases at all — the notes existed but were never surfaced. The check runs
  before `npm publish`, so a version with no changelog entry fails the run
  rather than shipping and then having nothing to say for itself.

### Changed

- **README rewritten for a public, enterprise audience.** It previously carried
  internal material — a "Why This Matters for Gamma" section framed around a
  DevRel role, internal success metrics, a stale task-list roadmap, and
  "Internal: Message Max directly" as the contribution route. It now leads with
  what the node does, how to install and authenticate, a full operations table,
  the two example workflows, and an honest roadmap. Support routes to GitHub
  issues.
- `package.json` `author` is now the organisation rather than an individual,
  with `bugs.url` pointing at GitHub issues.
- Delete emits `deleted: true` alongside `gammaId`, as n8n's UX guidelines ask,
  rather than passing the raw `{ status, gammaId, message }` through.
- Resource options are alphabetised, which n8n's linter requires once there are
  more than a handful.

## [0.3.0] - 2026-08-25

Theme and Folder become searchable pickers, two more values the API rejects are
corrected, and the undocumented `/me` endpoint is settled.

**Backward compatible.** Theme and Folder changed from string fields to resource
locators, but n8n passes non-locator values through unchanged, so workflows
saved before this release keep sending their stored IDs. Covered by tests.

### Added

- **Resource Locators for Theme and Folder.** Both, plus the template theme
  override, are now searchable pickers defaulting to "From List" and backed by
  `GET /themes` / `GET /folders`, with a "By ID" mode retained for expressions.
  Previously these were free-text fields, so users had to find an ID in the
  Gamma app and paste it.

### Fixed

- The `limit` parameter on List Themes and List Folders allowed up to 200; the
  API caps both at 50 and rejects more.

### Not included

- **OAuth 2.0** was implemented and then removed before release. Gamma's dynamic
  client registration only accepts redirect URIs on an allow-list, and n8n's
  redirect URL is per-instance, so registration fails with
  `redirect_uri not allowed` for every n8n user. An authentication option that
  cannot be completed is worse than none. The implementation is preserved in
  this branch's history and the blocker is documented in
  `docs/n8n-integration-plan.md` §5.

### Changed

- `Create a generation` is now `Create generation` — n8n's UX guidelines require
  action names to omit articles.

- The `/v1.0/me` question is settled: a live call confirms it returns 200 with
  `{ email, displayName, profileImageUrl, workspaceName, maxGenerateCards,
  availableImageModels }`. The `User` resource stays — its failure mode is
  contained — but nothing else depends on it while it remains undocumented.
  Its description now says what it actually returns, and `Number of Cards`
  points at `maxGenerateCards` for the reader's exact plan limit.
- The live `/me` check now prints an explicit verdict and the follow-up for each
  outcome, and tolerates a 401 (Gamma runs auth before routing, so a bad key can
  look like a missing route).

## [0.2.0] - 2026-08-24

Prepares the package for a provenance-signed publish, fixes several requests the
API could never have accepted, and makes the card-split behaviour legible.

Not yet released: publishing requires npm Trusted Publishers (or an `NPM_TOKEN`
secret) to be configured first. See `docs/n8n-publishing.md` §3.1.

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
- A test suite on Node's built-in runner (`node --test`, no framework
  dependency): **118 offline tests** across five files covering `preSend` hooks,
  the declarative routing layer, `displayOptions` visibility (asserted through
  n8n's own `displayParameter`), example workflows against the node schema, icon
  integrity, the package manifest, and the enum generator's parsing.
- `npm run test:live`: opt-in tests against the real API, skipped unless
  `GAMMA_API_KEY` is set. They confirm the credential test endpoint works, that a
  bad key is rejected, that bearer auth is not accepted, and whether the
  undocumented `GET /v1.0/me` exists — which decides the fate of the `User`
  resource. A real generation runs only with `GAMMA_LIVE_GENERATE=1`, so the
  suite spends no credits by default.
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
