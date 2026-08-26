# Gamma node for n8n

[![npm version](https://img.shields.io/npm/v/@gammatech/n8n-nodes-gamma.svg)](https://www.npmjs.com/package/@gammatech/n8n-nodes-gamma)
[![CI](https://github.com/gamma-app/n8n-nodes-gamma/actions/workflows/ci.yml/badge.svg)](https://github.com/gamma-app/n8n-nodes-gamma/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The official [Gamma](https://gamma.app) community node for [n8n](https://n8n.io).
Generate presentations, documents, webpages and social posts with AI, and manage
the ones you already have — from inside your n8n workflows.

Published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements),
so every release is cryptographically traceable to the commit and workflow that
built it. Ships with **zero runtime dependencies**.

---

## Installation

### From the n8n UI

**Settings → Community nodes → Install**, then enter:

```
@gammatech/n8n-nodes-gamma
```

### Manually

```bash
npm install @gammatech/n8n-nodes-gamma
```

### Requirements

| | |
| --- | --- |
| n8n | Any version supporting community nodes (`n8nNodesApiVersion` 1) |
| Node.js | 22.22 or later |
| Gamma plan | API access — see [access and pricing](https://developers.gamma.app/get-started/access-and-pricing) |

---

## Authentication

The node authenticates with a Gamma API key.

1. In Gamma, go to **Settings → API** and generate a key (it starts with `sk-gamma-`)
2. In n8n, create a **Gamma API** credential and paste the key
3. Use **Test** to confirm the connection

The key is stored as a password field and sent as the `X-API-KEY` header. It is
scoped to the workspace that issued it, and requests spend that workspace's
credits.

> Gamma also supports OAuth 2.0, which would let a workflow act on behalf of an
> individual user. It is not yet available here — see [Roadmap](#roadmap).

---

## Operations

| Resource | Operation | Description |
| --- | --- | --- |
| **Generation** | Create | Generate a presentation, document, webpage or social post |
| | Create from Template | Remix an existing Gamma with a new prompt |
| | Get Status | Poll a generation until it completes |
| **Gamma** | Get | Retrieve metadata for an existing Gamma |
| | Export | Start an export to PDF, PNG or PPTX |
| | Archive | Archive a Gamma (idempotent) |
| | Delete | Delete permanently (requires workspace admin) |
| **Export** | Get Status | Poll an export until it completes |
| **Theme** | List | Browse workspace themes |
| **Folder** | List | Browse workspace folders |
| **User** | Get User Information | Account and plan limits behind the API key |

Theme and Folder are also available as searchable pickers wherever a Gamma is
created, so you select from a list instead of pasting an ID.

### Gamma ID formats

Get and Export accept either the API file ID (usually `g_…`) or the doc ID from
a `gamma.app/docs/…` URL. **Archive and Delete accept only the file ID** and
return `403` for a URL slug.

---

## Examples

Importable workflows live in [`examples/`](examples). Both are validated against
the node's schema on every CI run, so the parameters in them stay correct.

### One card per row or array item

[`examples/one-card-per-item.json`](examples/one-card-per-item.json)

Turns CRM rows, form submissions or any list into a deck where each item gets
its own card. Join the items with `\n---\n`, set **Card Split** to
`Input Text Breaks` and **Text Mode** to `Preserve`.

Three things make this easy to get wrong:

- The separator is a line containing only `---`. A bare `---` mid-line is not a break.
- In that mode **Number of Cards is ignored**, which is why the node hides it.
- Text with **no** separator produces a *single* card, which usually reads as a
  bug rather than a setting.

`Preserve` keeps your wording exactly as supplied — the right choice whenever
text must not be reworded: dosages, legal terms, contract clauses, pricing.

### Generate and wait for the result

[`examples/auto-polling-workflow.json`](examples/auto-polling-workflow.json)

Generation is asynchronous. Create returns a `generationId` immediately, and
`gammaUrl` / `exportUrl` exist only once the status is `completed`. This
workflow polls every 5 seconds — the interval Gamma's documentation
recommends — and loops until the status stops being `pending`.

---

## Development

```bash
nvm use                 # Node 24, matching CI
npm install
npm run dev:n8n         # builds and starts a local n8n with the node loaded
```

Open <http://localhost:5678> and search for **Gamma** in the nodes panel.

> n8n reads node descriptions once at boot. After changing any parameter you
> must restart it — a rebuild alone will not show up.

### Scripts

| Command | Description |
| --- | --- |
| `npm run build` | Compile TypeScript and copy icons into `dist` |
| `npm run dev` | Type-check in watch mode |
| `npm run dev:n8n` | Local n8n with this node loaded |
| `npm run lint` / `lint:fix` | n8n's community-node linter |
| `npm test` | Full offline suite |
| `npm run test:live` | Opt-in tests against the real API |
| `npm run sync:enums` | Regenerate `apiEnums.ts` from Gamma's published docs |

### Testing

`npm test` runs offline on Node's built-in test runner — no test framework
dependency:

| Suite | Covers |
| --- | --- |
| `presend` | Every request hook: parameter paths and body composition |
| `routing` | Method and URL per operation, request defaults, credential auth |
| `visibility` | Parameter visibility rules, via n8n's own `displayParameter` |
| `gamma-lifecycle` | The Gamma and Export resources |
| `credentials` | Resource Locator pickers and list limits |
| `examples` | Example workflows against the node schema, icon integrity |
| `enums` | The enum generator's parsing, and the generated output |

Live tests need a key and are skipped without one:

```bash
GAMMA_API_KEY=sk-gamma-... npm run test:live
```

They spend no credits unless you also set `GAMMA_LIVE_GENERATE=1`. Archive and
delete are never exercised.

### Generated values

`nodes/Gamma/apiEnums.ts` is generated from Gamma's published documentation —
image models, output languages, and the card dimensions valid for each format.
Do not edit it by hand; run `npm run sync:enums`. CI checks daily that it is
still current, so a new image model surfaces as a failing build rather than a
support ticket.

---

## Releasing

Releases publish from GitHub Actions with a provenance attestation, which n8n
requires for verified community nodes. **Do not publish from a workstation** — a
package without provenance cannot be verified, and the version number is spent.

```bash
# 1. Add a CHANGELOG.md section for the version.
#    Release notes come from it, and the workflow refuses to publish without one.
# 2. Bump, commit, open a PR.
npm version minor --no-git-tag-version

# 3. After merging, tag the merge commit and push the tag.
git checkout main && git pull
git tag -a 0.4.0 -m "0.4.0"
git push origin 0.4.0
```

The tag triggers the publish workflow, which builds, lints, tests, verifies the
tag matches `package.json`, publishes with provenance, and creates the GitHub
Release.

Full process, including the local preflight checklist and n8n's verification
requirements: [`docs/n8n-publishing.md`](docs/n8n-publishing.md).

---

## Roadmap

Current coverage is 11 operations across 6 resources. The Gamma API exposes
more; these are the gaps, roughly in priority order.

**Planned**

- **Standalone image generation** — `POST /images` and its status endpoint, so
  workflows can generate on-brand images without creating a Gamma
- **Comments** — read comment threads, with `updatedSince` for efficient delta
  polling
- **Analytics** — document, per-card and per-viewer engagement metrics
- **Multi-page generation** — the `pages` array, building a multi-page File in
  one request and optionally publishing it as a site
- **Auto-pagination** on list operations, so they emit one item per result
  instead of a page wrapper

**Blocked**

- **OAuth 2.0.** Implemented and then withdrawn. Gamma's dynamic client
  registration only accepts redirect URIs on an allow-list, and n8n's redirect
  URL is per-instance, so no n8n user can currently register a client. Offering
  an authentication method that cannot be completed is worse than not offering
  it. Tracked in
  [`docs/n8n-integration-plan.md`](docs/n8n-integration-plan.md).

**Under consideration**

- **n8n Cloud verification.** Requires submission through the
  [n8n Creator Portal](https://creators.n8n.io/nodes) and review against n8n's
  UX guidelines.

---

## Support

- **Bugs and feature requests:** [GitHub issues](https://github.com/gamma-app/n8n-nodes-gamma/issues)
- **Gamma API documentation:** <https://developers.gamma.app>
- **Gamma help centre:** <https://help.gamma.app>

For pull requests, `npm test` and `npm run lint` should both pass. The test
suite is deliberately strict about things that stay invisible until a user hits
them — parameter paths, which endpoints the node targets, and whether the
example workflows still match the node's schema — so a failure there usually
means something real.

---

## License

[MIT](LICENSE)
