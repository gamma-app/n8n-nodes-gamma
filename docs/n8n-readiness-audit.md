# n8n readiness audit — @gammatech/n8n-nodes-gamma

State of the repo against `docs/n8n-publishing.md`.

- First audited **2026-08-24** at `5c34d76`; updated the same day after the
  publish-readiness changes below.
- `package.json` version: **0.1.4** (realigned to the registry). npm `latest`:
  **0.1.4**.
- n8n requires Node **≥ 22.22**; `.nvmrc` now pins **24** (Active LTS).

Everything here was verified by running the command shown.

---

## Where we stand

| # | Item | Status |
| --- | --- | --- |
| B1 | Published package has no provenance | **Open** — clears on the next release |
| B2 | Publish workflow can't produce a provenance publish | Fixed |
| B3 | Codex `node` claimed to be a built-in n8n node | Fixed |
| B4 | Codex categories weren't real n8n categories | Fixed |
| B5 | Repo linted against the retired plugin | Fixed — 48 real violations resolved |
| B6 | 20 of 21 `preSend` hooks threw on any optional parameter | Fixed — confirmed against n8n's stored state |
| C1 | Version drift vs npm | Fixed |
| C2 | `main` pointed at a nonexistent file | Fixed |
| C3 | Unused devDependencies | Fixed |
| C4 | No `CHANGELOG`; missing `engines` | Fixed |
| C5 | Root doc sprawl, two misleading publish guides | **Open** — needs a decision |
| C6 | UX gaps not caught by the linter | **Open** |

---

## Correction to the first audit

The first pass reported that the official linter "surfaced no rule violations in
`Gamma.node.ts` or `GammaApi.credentials.ts`". That was wrong. The run had been
short-circuited by the legacy `.eslintrc.js`, which produced four
`parserOptions.project` parse errors and stopped the real rules from ever
evaluating. With the correct flat config in place the linter reported **48 errors
and 1 warning**. All 48 are now fixed; the reasoning below reflects the real
findings.

---

## B1 — provenance (still open)

```
$ npx @n8n/scan-community-package @gammatech/n8n-nodes-gamma
❌ Package @gammatech/n8n-nodes-gamma@0.1.4 has failed security checks
Reason: Package was not published with npm provenance.
```

Versions 0.1.0–0.1.4 were all published from a laptop, so none can be verified.
This is forward-only: the fix is to publish 0.1.5 through the new workflow.
Two prerequisites are **human actions outside this repo**:

1. On npmjs.com, configure **Trusted Publishers** for this package
   (`gamma-app` / `n8n-nodes-gamma` / `publish.yml`), *or* confirm the existing
   `NPM_TOKEN` Actions secret is still valid. Without one of these the publish
   step fails.
2. Push a `0.1.5` tag. `0.1.4` is taken and npm won't accept a re-publish.

---

## B2 — publish workflow (fixed)

The old workflow had four independent faults: it triggered on GitHub-release
creation, pinned Node 18 (below n8n's minimum), ran `npm ci` with no committed
`package-lock.json` (**this step could not succeed**), and published without
`--provenance` or `id-token: write`.

`.github/workflows/publish.yml` now triggers on a version tag, reads `.nvmrc`
for the Node version, installs with `npm ci`, fails fast if the tag doesn't match
`package.json`, and publishes with `npm publish --provenance --access public`
under `permissions: id-token: write`.

Both the OIDC and `NPM_TOKEN` paths are supported, and the token branch is
written as a real `if` rather than the `[ -n "$X" ] && ...` form used by the n8n
starter — under GitHub's default `bash -e`, that one-liner fails the step when
the token is unset, which is exactly the OIDC case it's meant to allow.

## B3, B4 — codex file (fixed)

`node` is now `@gammatech/n8n-nodes-gamma` rather than `n8n-nodes-base.Gamma`,
and `categories` is `["Marketing & Content", "Productivity"]`. `AI` and
`Content Creation` are not n8n categories — invalid strings don't error, the node
just fails to appear where users browse.

## B5 — linting (fixed)

Replaced `eslint-plugin-n8n-nodes-base` + `.eslintrc.js` with n8n's current
linter: `@n8n/node-cli` as a devDependency and a three-line `eslint.config.mjs`
re-exporting `@n8n/node-cli/eslint`, matching the n8n starter.

`npm run lint` now exits **0**, with two informational warnings (see C6). What the
48 errors were, and how each was handled:

| Count | Rule | Resolution |
| --- | --- | --- |
| 21 | `@typescript-eslint/no-explicit-any` | Every `requestOptions.body as any` in the `preSend` hooks is now `IDataObject`. Nested option objects build via spread (`body.textOptions = { ...(body.textOptions as IDataObject), tone: value }`) instead of mutating through `any`. |
| 11 | `node-param-display-name-miscased` | Title Case, autofixed. |
| 7 | `node-param-options-type-unsorted-items` / `-collection-` | Alphabetised. The linter marked most as autofixable but wouldn't apply them, so they were reordered from the exact order the linter printed, then re-verified. |
| 2 | `node-param-description-wrong-for-limit` | Now `Max number of results to return`. |
| 1 | `node-param-description-missing-final-period` | Autofixed. |
| 1 | `node-usable-as-tool` | `usableAsTool: true` — the node is now available to AI agents as a tool. |
| 2 | `require-node-api-error` / `node-execute-block-wrong-error-thrown` | Invalid `Header/Footer Config (JSON)` now throws `NodeOperationError` with a fix-it `description` instead of a bare `Error`. |
| 1 | `no-unused-vars` | Bare `catch {}` in that handler. |
| 2 | `icon-validation` / `cred-class-field-icon-missing` | The credential had no icon. Added `credentials/icons/gamma.svg` and `icon: Icon = 'file:icons/gamma.svg'`, plus a gulp task copying credential icons into `dist`. |

Verified after the changes: clean `tsc` build, `npm run lint` exit 0, and
`npm pack --dry-run` produces 12 files — `dist`, `examples`, `LICENSE`,
`README.md`, `package.json`. The only `require()` in `dist` is still
`n8n-workflow`, and there is no `process.env` / `fs` / `child_process` access.

## C1–C4 (fixed)

- Version realigned `0.1.2` → `0.1.4` to match the registry.
- `main: index.js` removed; the file never existed and wasn't in `files`.
- Removed `@devlikeapro/n8n-openapi-node`, `js-yaml`,
  `eslint-plugin-n8n-nodes-base`, `@typescript-eslint/*`, and the standalone
  `eslint` — none were referenced. Node properties are hand-written declarative
  config, not generated at runtime.
- Added `CHANGELOG.md` and `engines.node: ">=22.22"`.
- `pnpm-workspace.yaml` (which had unfilled `allowBuilds` placeholders reading
  literally `set this to true or false`) is gone along with the rest of the pnpm
  migration — see below.

### Package manager: back to npm

The repo was mid-migration to pnpm, but **none of it was ever committed** — the
`convert-to-pnpm` branch has zero commits of its own and is identical to `main`,
whose committed state (and README) is npm throughout. Reverted to npm, because
every pnpm-related friction point was self-inflicted:

- `npm ci` in the old workflow could not work, because `package-lock.json` was
  gitignored while `pnpm-lock.yaml` was untracked.
- `pnpm publish` has no `--provenance` flag (pnpm 11.18), which forced a
  mixed-toolchain workflow: install with pnpm, publish with npm.
- `pnpm-workspace.yaml` existed *only* to suppress build-script warnings, and
  its `allowBuilds` entries had been left as literal placeholder strings.

Against that, pnpm's actual advantages — store dedup, workspaces, install speed
— are close to worthless for a single-node package with four devDependencies and
no monorepo. Meanwhile n8n's toolchain is npm-shaped end to end: the starter
commits `package-lock.json` and runs `npm ci`, the docs say `npm run lint` /
`npm run dev`, `n8n-node release` wraps release-it around npm, and provenance
plus trusted publishing are npm-native features. Reviewers cloning the repo will
type `npm install`.

So: `packageManager` removed, `prepublishOnly` back to npm, both pnpm files
deleted, `package-lock.json` un-gitignored and committed.

**One real finding from the switch:** `npm ci` failed against a lockfile
generated by npm 10 (`lock file's ignore@5.3.2 does not satisfy ignore@7.0.6`).
Node 22 ships npm 10; `.nvmrc` says 24, which ships npm 11. Regenerating the
lockfile under Node 24 fixed it. Generate lockfiles with the Node version in
`.nvmrc` — `nvm use` first — or CI will reject them.

npm 11 also warns that three transitive install scripts (`cpu-features`,
`es5-ext`, `unrs-resolver`) were not run. None are needed to compile or lint this
package, and it's a warning, not a failure — the same conclusion pnpm's
`allowBuilds` was reaching, minus the config file.

### Dependency refresh

Everything updatable was updated: `prettier` 3.3.2 -> 3.9.6, `gulp` 4.0.2 -> 5.0.1
(major, and our gulpfile only uses `src`/`dest`/`parallel`, all still present).
`@n8n/node-cli` was already at the latest 0.44.5. Dropping gulp 4's ancient
transitive tree shrank the dev install from **857 to 628 packages** and
`npm audit` from **24 vulnerabilities to 13**.

Two packages are held back on purpose — `npm outdated` will keep reporting them:

- **`typescript` stays on `^5.9.3`.** TypeScript 7 (the native rewrite) builds
  this package without complaint, but the n8n linter dies against it:
  `typescript-eslint` 8 loads `ts-api-utils`, which throws
  `TypeError: Cannot read properties of undefined (reading 'Intrinsic')` on TS
  7's compiler API. Lint gates `prepublishOnly` and is a verification
  requirement, so TS 7 is unusable until `@n8n/node-cli` catches up. Verified by
  installing 7.0.2, confirming `tsc` succeeded and `npm run lint` crashed, then
  reverting.
- **`n8n-workflow` stays a `*` peer.** Its `latest` dist-tag (2.16.0) is *behind*
  its `stable` tag (2.35.3), and n8n 2.35.7 depends on 2.35.3 — so `npm outdated`
  is advertising a downgrade. The host n8n instance provides this at runtime; the
  local copy only exists to typecheck against.

The 3 vulnerabilities that survive `npm audit --omit=dev` all come from that
`n8n-workflow` peer tree (`@n8n/utils`, `nanoid`). Our tarball ships zero
dependencies, so they are n8n's to fix, not ours.

`n8n.strict: true` was **deliberately not added**, even though the current n8n
starter sets it. It isn't documented on any n8n docs page, so its effect on the
node loader is unverified — enabling an undocumented loader flag immediately
before a release is the kind of change that fails quietly. Worth testing behind
`npm run dev:n8n` and adding separately.

---

## Runtime verification, and a bug it found

Verified by exercising the built node directly (`npm test`, kept at
`test/presend.js`) rather than only through the UI. All 21 `routing.send.preSend`
hooks run, compose into one request body, and the `IDataObject`/spread rewrite is
confirmed correct: `textOptions`, `imageOptions`, `cardOptions`, `sharingOptions`
and the nested `sharingOptions.emailOptions` each keep every writer's keys
instead of clobbering one another, and an invalid `Header/Footer Config (JSON)`
raises `NodeOperationError`.

**It also surfaced a pre-existing bug that made almost every optional parameter
throw.** n8n's routing engine calls `preSend` with the *node-level* context
(`routing-node.ts`: `preSendMethod.call(executeSingleFunctions, ...)`), and
`getNodeParameter` resolves via `get(node.parameters, parameterName)` — a lodash
path lookup that throws `Could not get parameter "<name>"` on a miss. Parameters
inside a collection live at `additionalOptions.<name>`, and n8n's own code reads
them that way (`basePath + nodeProperties.name`). Our hooks asked for the bare
name.

Result: **20 of 21 hooks threw the moment a user set that option.** The node
worked only with no optional parameters set at all — presumably why earlier
manual testing missed it. Every call is now fully qualified
(`additionalOptions.tone`, `themeAdditionalFields.query`,
`folderAdditionalFields.folderQuery`, ...), verified by re-auditing the built
output: 22 correct, 0 broken. `test/presend.js` mocks `getNodeParameter` to throw
on a bare nested name, so this cannot regress silently.

Confirmed empirically afterwards against n8n's own persisted state. Adding
`Audience` to a node in the editor and reading `workflow_entity.nodes` out of
n8n's SQLite stores it as:

```json
{
  "inputText": "Q3 results overview",
  "additionalOptions": { "audience": "board of directors" },
  "requestOptions": {}
}
```

So `get(node.parameters, 'audience')` is `undefined` (the old code — throws) and
`get(node.parameters, 'additionalOptions.audience')` returns the value (the fix).

### The n8n UI check (done)

Verified in a live n8n 2.35.7 with the node loaded:

- Node appears in the nodes panel, searchable as **Gamma**, with its icon
  rendering. Both icons resolve — node and the newly added credential icon serve
  `200 image/svg+xml`, which confirms the relative `file:icons/gamma.svg` path and
  the new gulp task.
- `usableAsTool: true` took effect: n8n generated a companion **Gamma Tool** node
  for AI agents.
- All 6 actions render grouped by resource (Generation / Theme / Folder / User).
- Parameters render correctly: Title Case labels, the `e.g. Create a presentation
  about renewable energy` placeholder, and the canvas subtitle expression
  (`create: generation`).
- The **Additional Options** dropdown lists options in exactly the alphabetical
  order the linter forced, confirming that reordering landed as intended.
- The credential's `apiKey` is a password field.

Two notes from the UI pass:

- In dev/custom-load mode n8n reports the node as `CUSTOM.gamma` and overrides
  `codex.categories` to `["Custom Nodes"]`. The corrected categories therefore
  can't be verified this way — they apply to a real npm install.
- Minor UX nit: the action reads **"Create a generation"**. The UX guidelines say
  to omit articles in `action` names ("Update row in sheet", not "Update a row in
  a sheet"), so "Create generation" is the guideline-conformant wording.

## Still open

### C5 — root documentation sprawl

Fourteen status/report files sit in the repo root: `BUILD_SUMMARY.md`,
`CI_SETUP_GUIDE.md`, `COMPLETE_FIELDS_LIST.md`, `COMPLIANCE_AUDIT.md`,
`FINAL_REVIEW.md`, `POLLING_SOLUTION.md`, `PUBLISHING_SCOPED_PACKAGE.md`,
`PUBLISH_GUIDE.md`, `READY_TO_PUBLISH.md`, `SETUP_COMPLETE.md`, `TESTING_NOW.md`,
`TEST_RESULTS.md`, `WORKFLOW_SETUP.md`.

Two now actively contradict the release process:

- `PUBLISH_GUIDE.md` and `PUBLISHING_SCOPED_PACKAGE.md` both instruct a manual
  `npm publish` — precisely what disqualifies a package from verification.
- `PUBLISHING_SCOPED_PACKAGE.md` names the package `@gammatech/n8n-nodes`, which
  is not what we publish, and hard-codes an absolute path from another
  developer's machine.

Recommend deleting those two in favour of `docs/n8n-publishing.md`, and either
archiving the rest under `docs/history/` or removing them. Left alone pending a
decision — deleting a colleague's documents isn't a call to make unasked.

### C6 — UX gaps the linter can't catch

These are checked by human review for verification:

- **Resource Locator.** Theme ID and Folder IDs are free-text (`e.g. abc123def456`).
  The UX guidelines call for a Resource Locator defaulting to `From list`
  wherever a user picks one item. This is the most likely reviewer objection, and
  it needs `loadOptions`/`listSearch` methods that don't exist yet.
- **`Simplify` parameter.** Endpoints returning more than 10 fields should expose
  a `Simplify` boolean. Not yet audited per endpoint against the Gamma API.
- **CRUD coverage.** Theme, Folder, and User are read-only. That may be all the
  API offers — worth confirming so it's a deliberate answer rather than a gap.
- **Icon theme variants** (2 lint warnings). `gamma.svg` is a full-bleed
  gradient tile with its own background, so it reads correctly on both light and
  dark. Supplying `{ light, dark }` pointing at the same asset would silence the
  warning without improving anything, so it's left as a warning. If a
  transparent-background mark is ever adopted, this becomes real.
- Credential placeholder `sk-gamma-xxxxx` should start with `e.g. `.

### Not attempted

- **A real API call.** `npm test` and the UI pass cover everything up to the HTTP
  request. Nothing has confirmed the assembled request body is what the Gamma API
  actually accepts, or that responses map cleanly onto node output — that needs a
  real API key. Entering one is a credential action, so it stays with a human.
- **Note for future local runs:** n8n's first run requires an owner account, and
  `N8N_USER_MANAGEMENT_DISABLED=true` no longer bypasses it in n8n 2.x. The dev
  instance keeps its data in `~/.n8n-node-cli/.n8n/`, and that SQLite is in WAL
  mode — copy `database.sqlite-wal` alongside the main file or recent writes look
  like they were never saved.

- **Full `@n8n/node-cli` migration.** `build` is still `tsc && gulp build:icons`
  rather than `n8n-node build`, and `dev` is still `tsc --watch` (with
  `dev:n8n` added alongside for the real thing). n8n only "strongly suggests"
  its scaffolding, and swapping the build out is a larger change best done on
  its own.

---

## Migration notes

What changes for anyone working in this repo:

1. **Node 24.** `.nvmrc` says `24`; this machine was on 22.23.2. Run
   `nvm install 24`. n8n's floor is 22.22, so 22.x still works — but CI reads
   `.nvmrc`, so local and CI diverge until you upgrade.
2. **Releases trigger on tags, not GitHub Releases.** The flow is
   `npm version patch` then `git push origin main --follow-tags`. Publishing a
   release from the GitHub UI against a *new* tag creates that tag and will
   normally fire the workflow too, but the tag is the contract — and the tag must
   match `package.json` or the run fails before publishing.
3. **First provenance release must be 0.1.5.** 0.1.4 is occupied.
4. **`npm run lint` is stricter and gates publishing.** `prepublishOnly` runs build
   and lint, so a violation blocks the release. That's intended.
5. **Dropdowns look different.** Title Case labels and alphabetical option order
   are UI-visible: `Auto | Dall-E 3 | Flux Fast 1.1 | ...` instead of
   cheapest-first, and `Can Comment | Can Edit | Default | Full Access | No
   Access | View Only` instead of the permission gradient. Saved workflows are
   unaffected — only labels moved, the underlying `value`s are untouched. Any
   screenshots or docs showing the old ordering are now stale.
6. **`package-lock.json` is now tracked** and must be committed whenever
   dependencies change — `npm ci` fails without it. Regenerate it under Node 24
   (`nvm use`), never Node 22.
7. **Editors need flat-config ESLint.** `.eslintrc.js` is gone, replaced by
   `eslint.config.mjs`. Current ESLint extensions handle this; very old ones
   won't.
8. **Installs are heavier.** `@n8n/node-cli` pulls ~857 packages. Dev-only, and
   it's the toolchain n8n requires. `npm audit` reports dev-tree vulnerabilities
   as a result; the three that show under `--omit=dev` come from the
   `n8n-workflow` peer dependency, which the host n8n instance provides. Our own
   tarball ships **zero** dependencies.
