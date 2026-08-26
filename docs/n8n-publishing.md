# Publishing this node to n8n

Reference for shipping `@gammatech/n8n-nodes-gamma` to npm and getting it verified
by n8n. Covers what to check locally, how to test in a real n8n instance, the
release mechanics, and the Creator Portal submission.

Upstream source of truth (fetch the `.md` variant of any page for the raw text):

| Topic | URL |
| --- | --- |
| Section index | <https://docs.n8n.io/connect/create-nodes> |
| Community node standards | <https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes.md> |
| Verification guidelines | <https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines.md> |
| UX guidelines | <https://docs.n8n.io/connect/create-nodes/build-your-node/reference/ux-guidelines.md> |
| Code standards | <https://docs.n8n.io/connect/create-nodes/build-your-node/reference/code-standards.md> |
| Codex (`*.node.json`) files | <https://docs.n8n.io/connect/create-nodes/build-your-node/reference/codex-files.md> |
| Node linter | <https://docs.n8n.io/connect/create-nodes/test-your-node/node-linter.md> |
| Run locally | <https://docs.n8n.io/connect/create-nodes/test-your-node/run-your-node-locally.md> |
| `n8n-node` CLI | <https://docs.n8n.io/connect/create-nodes/build-your-node/using-the-n8n-node-tool.md> |
| Troubleshooting | <https://docs.n8n.io/connect/create-nodes/test-your-node/troubleshooting.md> |

The whole docs index is at <https://docs.n8n.io/llms.txt>.

---

## 0. The two bars

There are two separate bars, and it matters which one you are aiming at.

**Bar 1 — installable community node.** Published to npm under a
`n8n-nodes-*` / `@scope/n8n-nodes-*` name with the right `package.json` metadata.
Self-hosted users can install it from **Settings → Community nodes**. This is
where we are today.

**Bar 2 — verified community node.** n8n vets the package; it then shows up in
the nodes panel for every deployment type including n8n Cloud. This needs the
technical guidelines, the UX guidelines, *zero runtime dependencies*, and — since
**1 May 2026** — publication from a **GitHub Actions workflow with an npm
provenance statement**. n8n will not verify a package published from a laptop.

Cloud availability only comes with Bar 2. Everything in §3 (release) is written
to satisfy Bar 2, because doing it any other way means republishing later.

---

## 1. Local preflight

Run this before every release. Each item is a hard requirement from the standards
or verification pages unless marked *(recommended)*.

### 1.1 Package identity

```bash
# name, keywords, license, repo, n8n block, files, version
node -e 'const p=require("./package.json"); console.log(JSON.stringify({
  name:p.name, version:p.version, license:p.license,
  keywords:p.keywords, repo:p.repository?.url,
  n8n:p.n8n, files:p.files,
  deps:Object.keys(p.dependencies||{})
},null,2))'
```

- [ ] `name` starts with `n8n-nodes-` or `@<scope>/n8n-nodes-`.
- [ ] `keywords` contains `n8n-community-node-package`.
- [ ] `license` is `MIT`. Verification requires MIT specifically.
- [ ] `repository.url` points at a **public** GitHub repo that actually exists,
      and matches what npm shows (`npm view <pkg> repository`).
- [ ] `author` on npm matches the repo maintainer.
- [ ] `n8n.nodes[]` and `n8n.credentials[]` list every built artifact by its
      `dist/...` path, and `n8n.n8nNodesApiVersion` is `1`.
- [ ] `files` ships `dist` (and `LICENSE`).
- [ ] `dependencies` is empty. **Verified nodes may not have any runtime
      dependencies.** Dev-only tooling in `devDependencies` is fine;
      `n8n-workflow` belongs in `peerDependencies`.
- [ ] *(recommended)* `n8n.strict: true`, as the current n8n starter sets.
      Deliberately not enabled here yet: it isn't documented on any n8n docs
      page, so test it under `npm run dev:n8n` before turning it on.

### 1.2 No runtime deps, no env, no filesystem

Verification bans runtime dependencies, environment-variable access, and
filesystem access. Check the **built output**, not just the source — a package
that imports a `devDependency` compiles fine and then explodes at runtime in
someone else's n8n.

```bash
npm run build
# Every require() in dist should be n8n-workflow and nothing else
grep -rhoE "require\(\"[^\"]+\"\)" dist | sort -u
# Should print nothing:
grep -rnE "process\.env|require\(['\"](fs|path|child_process|os)['\"]\)" dist nodes credentials
```

- [ ] Only `n8n-workflow` is required at runtime.
- [ ] No `process.env`, no `fs`/`child_process`/`os`.
- [ ] All configuration comes in through node parameters and credentials.
- [ ] HTTP goes through the declarative `routing` block or
      `this.helpers.httpRequestWithAuthentication` — never a bundled SDK or
      `axios` import of our own.

### 1.3 Build output matches the manifest

```bash
npm run build
for f in $(node -e 'const p=require("./package.json");console.log([...p.n8n.nodes,...p.n8n.credentials].join(" "))'); do
  [ -f "$f" ] && echo "ok   $f" || echo "MISSING $f"
done
ls dist/nodes/*/*.svg dist/nodes/*/*.png 2>/dev/null
```

- [ ] Every path in the `n8n` block exists after a clean build.
- [ ] Icons are copied into `dist` (this is what `gulp build:icons` is for).
- [ ] A stale `dist` cannot hide a broken build: `rm -rf dist && npm run build`.

### 1.4 Codex file (`*.node.json`)

- [ ] Filename matches the node base file (`Gamma.node.ts` → `Gamma.node.json`).
- [ ] `node` is the **package name**, e.g. `@gammatech/n8n-nodes-gamma`.
      `n8n-nodes-base.*` is reserved for n8n's built-in nodes — using it in a
      community package is wrong.
- [ ] `nodeVersion` matches the `version` in the node description.
- [ ] `codexVersion` is `"1.0"`.
- [ ] `categories` uses **only** these exact strings:
      `Data & Storage`, `Finance & Accounting`, `Marketing & Content`,
      `Productivity`, `Miscellaneous`, `Sales`, `Development`, `Analytics`,
      `Communication`, `Utility`. Anything else (e.g. `AI`,
      `Content Creation`) is silently invalid.
- [ ] `resources.primaryDocumentation` and `resources.credentialDocumentation`
      point at live URLs.

### 1.5 Credentials

- [ ] The credential class `name` (e.g. `gammaApi`) is exactly the string in the
      node's `credentials: [{ name: ... }]`. A mismatch produces
      `Credentials of type "*" aren't known`.
- [ ] Every secret field is a password field:
      `typeOptions: { password: true }`.
- [ ] A credential test exists (`test: { request: ... }`) so users get a
      **Connection tested successfully** rather than discovering the failure
      three nodes downstream.
- [ ] `documentationUrl` resolves.

### 1.6 Icons

- [ ] SVG canvas is square, or PNG is exactly **60×60**.
- [ ] `icon` includes the extension and the `file:` prefix
      (`file:gamma.svg`).
- [ ] Icon lives in the same folder as the node file.

### 1.7 Lint

n8n's current linter is `@n8n/eslint-plugin-community-nodes`, shipped through
`@n8n/node-cli`. It replaced the older `eslint-plugin-n8n-nodes-base`; a clean
run of the old plugin does **not** mean a clean run of the new one. This repo is
wired to the official linter via `eslint.config.mjs`, which just re-exports
`@n8n/node-cli/eslint` — don't edit that file or add a legacy `.eslintrc.js`
alongside it.

```bash
npm run lint          # n8n-node lint
npm run lint:fix      # n8n-node lint --fix
```

- [ ] Lint exits 0. Informational warnings are acceptable if the reason is
      recorded; errors are not.
- [ ] No stray `.eslintrc.js` — a legacy config shadows the flat config and
      produces `parserOptions.project` parse errors that silently prevent the
      real rules from running.
- [ ] Autofix is not always complete. `node-param-options-type-unsorted-items`
      reports as autofixable but may not apply; the error text prints the exact
      required order, so reorder from that and re-run.
- [ ] Any `eslint-disable` in the node has a comment justifying it.

### 1.8 UX and copy

These are enforced by human review for verification, and they are the most
common reason for a rejection. Full list in the UX guidelines page.

- [ ] **Title Case** for node `displayName`, parameter display names, dropdown
      titles.
- [ ] **Sentence case** for `action` names, node/parameter descriptions,
      hints, dropdown descriptions.
- [ ] Boolean descriptions start with `Whether ...`.
- [ ] Placeholders start with `e.g. ` (`e.g. https://example.com/image.png`).
- [ ] Operation `name` is Title Case and does not repeat the resource when a
      resource selector sits above it; `action` is sentence case, omits
      articles, and *does* name the resource ("Create presentation").
- [ ] Uses Gamma's **product** terminology, not API field names.
- [ ] Endpoints returning more than 10 fields expose a `Simplify` boolean —
      display name `Simplify`, description
      *"Whether to return a simplified version of the response instead of the
      raw data"*.
- [ ] Resource Locator component used wherever the user picks one item
      (themes, folders), defaulting to `From list`.
- [ ] Delete-style operations return `{"deleted": true}`.
- [ ] CRUD coverage per resource where the API supports it: Create, Get,
      Get Many, Update, Delete.
- [ ] Error messages say *what happened*; error descriptions say *how to fix
      it*. Avoid "error", "problem", "failure". Append `[item N]` when the
      failing item index is known.
- [ ] **English only** — parameters, descriptions, help text, error messages,
      README.

### 1.9 Dependency pins

`npm outdated` is **not** expected to come back empty. Two entries are held
deliberately, and both will look like neglect to anyone who doesn't know why:

| Package | Held at | Why |
| --- | --- | --- |
| `typescript` | `^5.9.3` | TS 7 (the native rewrite) compiles this package fine, but **the n8n linter cannot run against it**: `typescript-eslint` 8 pulls `ts-api-utils`, which crashes on TS 7's changed compiler API (`TypeError: Cannot read properties of undefined (reading 'Intrinsic')`). Since lint gates `prepublishOnly` and is a verification requirement, TS 7 is a blocker until `@n8n/node-cli` ships a `typescript-eslint` that supports it. The caret keeps us inside 5.x rather than silently jumping. |
| `n8n-workflow` | `*` (peer) | The registry's `latest` tag (2.16.0) **lags** its `stable` tag (2.35.3), so `npm outdated` reports a *downgrade* as an update. n8n 2.35.7 itself depends on `n8n-workflow@2.35.3`. Leave the peer range as `*`; the host n8n instance supplies the real one at runtime. Don't pin it, and don't "fix" this row. |

Before bumping anything else, check that `@n8n/node-cli` still lints and that
`npm run build` still produces every path in the `n8n` block.

### 1.10 Docs

- [ ] README covers install, credential setup, every resource/operation, and at
      least one worked example workflow.
- [ ] `examples/*.json` still import cleanly into current n8n.
- [ ] No stale claims (wrong package name, wrong version, dead links).

---

## 2. Local testing

### 2.1 Requirements

Node **≥ 22.22.0**. `.nvmrc` pins **24** and CI reads that same file, so run
`nvm use` in the repo before anything else. This matters more than it looks: npm
10 (which ships with Node 22) generates a `package-lock.json` that npm 11 then
rejects as out of sync, so a lockfile written on the wrong Node version breaks
`npm ci` in CI. n8n installed globally, or driven by `n8n-node dev`.

### 2.2 Preferred: `n8n-node dev`

One command — builds, starts a local n8n with the node loaded, and rebuilds on
change:

```bash
npm run dev:n8n      # -> n8n-node dev
# open http://localhost:5678
```

(`npm run dev` is still plain `tsc --watch`, for when you only want a type-check
loop. The build itself is still `tsc && gulp build:icons` rather than
`n8n-node build`.)

### 2.3 Fallback: `npm link` into `~/.n8n/custom`

Works with the current tsc + gulp build:

```bash
npm install -g n8n

# in this repo
npm run build
npm link

# in the n8n custom-extensions dir (create it once if missing)
mkdir -p ~/.n8n/custom && cd ~/.n8n/custom && npm init -y
npm link @gammatech/n8n-nodes-gamma

n8n start
```

Gotchas that will cost you an hour otherwise:

- Search the nodes panel by the **node** name (`Gamma`), not the package name.
- Changing `description` properties requires a full n8n restart (`ctrl+c`), and
  sometimes re-running `npm link`.
- If the node is missing entirely, it is almost always the `n8n` block in
  `package.json` pointing at a path that does not exist in `dist`.
- If the icon is missing, the build did not copy it into `dist`.
- `~/.n8n` is hidden; `N8N_CUSTOM_EXTENSIONS` overrides the location.

### 2.4 What to actually exercise

- [ ] Every resource × operation, against the real Gamma API.
- [ ] The credential test button, with a good key and a bad key.
- [ ] A 4xx from the API — confirm the message is actionable.
- [ ] A long-running generation, including the polling example workflow.
- [ ] Multiple input items, to confirm item linking and no mutation of incoming
      data.
- [ ] Expressions in the main parameters.

### 2.5 Scan the published package

n8n runs this against your published tarball. Run it yourself before submitting:

```bash
npx @n8n/scan-community-package @gammatech/n8n-nodes-gamma
```

It checks provenance and security posture and prints the exact reason for a
failure.

---

## 3. Release process

The publish must happen **in GitHub Actions with provenance**. Provenance is a
signed attestation that a specific workflow, in a specific repo, at a specific
commit, produced the tarball; GitHub signs it via its OIDC infrastructure.
Without it the package cannot be verified, and from 1 May 2026 n8n's guidance is
that *all* community nodes should be published this way.

### 3.1 One-time setup

**A. Workflow.** Put a provenance-capable workflow at
`.github/workflows/publish.yml`. Base it on
<https://github.com/n8n-io/n8n-nodes-starter/blob/master/.github/workflows/publish.yml>.
Non-negotiable parts:

```yaml
on:
  push:
    tags: ['*.*.*']        # or 'v*.*.*' — pick one and stay consistent

jobs:
  publish:
    permissions:
      id-token: write      # required to mint the OIDC token for provenance
      contents: read
```

This repo uses **npm**, matching the starter and the rest of n8n's toolchain, so
`npm ci` + `npm publish --provenance --access public` works as documented.
`package-lock.json` must stay committed — `npm ci` fails without it.
`--access public` is required for a scoped package.

Two things not to copy verbatim from the starter:

1. **The token guard.** The starter writes
   `[ -n "$NPM_TOKEN" ] && npm config set ...`. GitHub runs `run:` blocks under
   `bash -e`, so when `NPM_TOKEN` is unset that statement returns non-zero and
   fails the step — breaking exactly the OIDC path it's meant to enable. Use a
   real `if` block.
2. **`node-version: 'lts/*'`.** Pin from `.nvmrc` instead
   (`node-version-file: '.nvmrc'`) so local and CI can't drift.

If you ever reconsider pnpm: `pnpm publish` has no `--provenance` flag (checked
against pnpm 11.18), so you'd have to install with pnpm and publish with npm.
That split, plus pnpm's `allowBuilds` config, is the whole reason this repo went
back to npm — see `docs/n8n-readiness-audit.md`.

**B. npm trust.** Prefer OIDC trusted publishing over a long-lived token:

npmjs.com → the package → **Settings → Publish access → Trusted Publishers →
Add a publisher → GitHub Actions**, then fill in:

- Repository owner: `gamma-app`
- Repository name: `n8n-nodes-gamma`
- Workflow name: `publish.yml` (the *filename*, not the `name:` field)
- Environment: blank

With OIDC configured, leave `NPM_TOKEN` unset. Fallback is a **Granular Access
Token** scoped to this package with read+write publish, stored as the
`NPM_TOKEN` Actions secret.

**C. Node version.** Set the workflow's `node-version` to match `.nvmrc` and to
be ≥ 22.22.0.

### 3.2 Per-release

```bash
# 1. Start clean and current, on the Node version CI uses
nvm use            # reads .nvmrc
git checkout main && git pull && git status --porcelain   # must be empty

# 2. Reconcile the version. package.json can drift behind npm.
node -p "require('./package.json').version"
npm view @gammatech/n8n-nodes-gamma version

# 3. Full preflight (§1) + local smoke test (§2)
rm -rf node_modules dist && npm ci
npm run build && npm run lint
npm pack --dry-run          # confirm the tarball contents

# 4. Bump. Semver: breaking node behaviour = major, new ops = minor, fixes = patch.
npm version patch|minor|major        # writes package.json, commits, tags

# 5. Update CHANGELOG.md and README if operations changed, amend into the bump

# 6. Push the commit and the tag — the tag is what triggers publishing
git push origin main --follow-tags
```

Then watch the Actions run. Do **not** publish from your laptop as a
workaround — a locally published version has no provenance and permanently
occupies that version number.

### 3.3 Post-release verification

```bash
npm view @gammatech/n8n-nodes-gamma version dist-tags
npm view @gammatech/n8n-nodes-gamma --json | grep -i provenance
npx @n8n/scan-community-package @gammatech/n8n-nodes-gamma   # must pass
```

- [ ] npm shows the new version as `latest`.
- [ ] The npm package page shows the **provenance / built and signed on GitHub
      Actions** attestation.
- [ ] The scanner passes.
- [ ] Fresh install into a clean n8n from the registry (not `npm link`) and run
      one workflow.
- [ ] GitHub Release exists with notes. `publish.yml` creates it from the
      matching `CHANGELOG.md` section, and refuses to publish at all if that
      section is missing — so write the changelog entry *before* tagging.

### 3.4 Rollback

npm unpublish is effectively unavailable after 72h and for versions with
dependents. Roll forward instead: fix, bump patch, release. If a version is
actively harmful, `npm deprecate @gammatech/n8n-nodes-gamma@X.Y.Z "use X.Y.Z+1"`.

---

## 4. Submitting for verification

Once §1–§3 pass and a provenance-published version is on npm:

1. Confirm every verification guideline is met:
   - Not a duplicate of an existing node. (Iterating on an existing n8n node
     means a PR to n8n, not a new package.)
   - Exactly one third-party service per package. A trigger node for the same
     service may ship alongside.
   - Not a Logic or Flow-control node — n8n is not accepting those.
   - Public repo, matching npm metadata, MIT, README with usage and auth.
   - Zero runtime dependencies; no env or filesystem access.
   - Official linter clean; `@n8n/scan-community-package` clean.
   - English only.
2. Sign in at <https://creators.n8n.io/nodes> and submit the package name.
3. n8n fetches the package from npm for final vetting. Expect review latency and
   iterate on their feedback.

n8n reserves the right to reject nodes that compete with its paid or enterprise
features. Also worth knowing: n8n maintains a **blocklist** for malicious or
harmful-quality nodes (<https://docs.n8n.io/integrations/community-nodes/blocklist.md>).

---

## 5. Planned skills

This document is the raw material for a set of skills. Suggested split, so each
one has a single verifiable outcome:

| Skill | Does | Consumes |
| --- | --- | --- |
| `n8n-node-preflight` | Runs every mechanical check in §1 and reports pass/fail per item — package metadata, dist-vs-manifest, runtime deps, codex validity, icon dims, official linter | §1 |
| `n8n-node-ux-audit` | Reads the node's `properties` tree and audits copy against the UX guidelines: casing, `Whether`, `e.g.`, operation naming, Simplify, resource locators | §1.8 |
| `n8n-node-local-test` | Builds, links or `n8n-node dev`, boots n8n, drives a smoke workflow per operation | §2 |
| `n8n-node-release` | Version reconciliation vs npm, bump, tag, push, watch the Actions run, verify provenance + scanner | §3 |
| `n8n-node-verification-submit` | Final checklist against the verification guidelines, then the Creator Portal submission | §4 |

`n8n-node-preflight` is the one to build first: it is fully mechanical, it is
what gates every release, and the current repo fails several of its checks.
See `docs/n8n-readiness-audit.md`.
