# Plan: making the Gamma n8n integration solid

Inputs to this plan:

- The field notes on `cardSplit` / `numCards` / one-card-per-item (reproduced in §2).
- A review of the **production** API docs at <https://developers.gamma.app>
  (`llms.txt` index, `llms-full.txt`, and the embedded OpenAPI schema) against
  what `nodes/Gamma/Gamma.node.ts` actually ships, on 2026-08-24.

Everything below was checked against both sides. Where a claim needs a live API
key to confirm, it says so.

---

## 0. Status

Phases 1, 2 and the drift-prevention half of Phase 6 are **implemented** in the
working tree. Verified: `npm run lint` clean (0 errors), `npm test` green
(`test/presend.js` + `test/examples.js`), clean `tsc` build.

| Item | State |
| --- | --- |
| A1 image source enum | done |
| A2 folder single-value + clear error | done |
| A3 credential test → `GET /v1.0/themes` | done |
| A4 `User` resource targets undocumented `/me` | resolved — confirmed live, kept with a caveat |
| A5 dimensions per format | done |
| A6 warnings | withdrawn — was never broken |
| A7 `exportAs` + `png` | done |
| A8 image models 11 → 40, generated | done |
| A9 languages 18 → 67, generated | done |
| A10 invalid `other` language removed | done |
| A11 / A12 example workflow node type + `numCards` nesting | done |
| B1 hide + suppress `numCards` | done |
| B2 `---` guidance in option text and hint | done |
| 2.3 example workflow | done — `examples/one-card-per-item.json` |
| 2.4 `preserve` framing | done |
| Phase 6 enum sync + `--check` + CI | done |
| Phase 6 delete `COMPLETE_FIELDS_LIST.md` | **open** — deletion is the user's call |
| Gulp 5 binary-encoding regression | found during verification, fixed |
| A13 list `limit` capped at 200 when the API allows 50 | fixed |
| D1 OAuth2 credential | done — **needs one live flow to confirm** |
| D2 Resource Locators for Theme and Folder | done |
| D3 `Simplify` parameter | **not applicable yet** — see §5 |
| Action naming (drop articles) | done |
| Error mapping | not started |
| Phase 3 coverage | not started |

Two things worth knowing about the implementation:

- `numCards` is defended twice: hidden via `displayOptions.hide` on
  `/additionalOptions.cardSplit`, **and** suppressed in its `preSend`. The
  second matters because n8n still sends a hidden parameter that holds a value,
  so a stale `numCards` from before the user switched Card Split would otherwise
  ride along.
- The four per-format `Card Dimensions` parameters share one `displayName` and
  differ by internal name (`cardDimensionsPresentation`, …), gated on `/format`.
  Only one is ever visible.

---

## 1. Headline: the node is a 6-operation subset of an 18-endpoint API

`COMPLETE_FIELDS_LIST.md` in this repo claims "100% Complete — every parameter
from the v1.0 API documentation is now implemented". That is no longer true, and
it was measured against a docs URL (`/v1.0/update/docs/...`) that has since been
restructured. The current reality:

| | Production API | Node today |
| --- | --- | --- |
| Endpoints covered | 18 | 5 (plus one, `/me`, that isn't in the docs at all) |
| Image models | 46 | 11 |
| Output languages | 67 | 18 |
| Multi-page (`pages`) | up to 50 pages | not supported |

That doc should be deleted rather than corrected — a hand-maintained
"completeness" claim is exactly the thing that rots. §6 replaces it with a check
that can't lie.

### Severity summary

| # | Finding | Impact | Phase |
| --- | --- | --- | --- |
| A1 | `imageOptions.source` offers `unsplash`, which is **not** in the API enum | Request rejected / silently wrong | 1 |
| A2 | `folderIds` invites a comma-separated list; API accepts **at most 1** | Request rejected | 1 |
| A3 | Credential test hits undocumented `GET /v1.0/me` | "Test connection" may fail on a *valid* key | 1 |
| A4 | `User → Get user information` targets the same undocumented endpoint | Works, but unpublished — see §3 | 1 |
| A5 | Card dimensions not constrained by `format` | Silently ignored + a warning nobody sees | 1 |
| ~~A6~~ | ~~Response `warnings` discarded~~ — **false alarm**, see §1.1 | none | — |
| A7 | `exportAs` missing `png` | Capability silently absent | 1 |
| A8 | 46 image models → 11, with credit costs hardcoded in labels | Stale on every model launch | 1 + 6 |
| A9 | 67 languages → 18 | Users can't select supported languages | 1 + 6 |
| A10 | `Language` offers `Other (Enter Code)`, sending the literal `other` | Request rejected | 1 |
| A11 | `examples/auto-polling-workflow.json` uses node type `n8n-nodes-base.gamma` | Example won't import | 1 |
| A12 | Same example sets `numCards` at top level, where the node never reads it | Silently ignored | 1 |
| B1 | `numCards` shown as meaningful when `cardSplit: inputTextBreaks` | The reported customer confusion | 2 |
| B2 | No guidance that `inputTextBreaks` + no `---` = **1 card** | Silent, looks like a product bug | 2 |
| C1 | `pages[]` + `publish` unsupported | Can't build multi-page sites | 3 |
| C2 | `title` unsupported | Can't set a deterministic title | 3 |
| C3 | Images, gammas, export, analytics endpoints absent (13 endpoints) | Large capability gap | 3 |
| D1 | No OAuth credential, though Gamma supports OAuth 2.0 | **Blocks n8n verification** | 4 |
| D2 | `themeId` / `folderIds` are free text, not Resource Locators | **Blocks n8n verification** | 4 |
| D3 | No `Simplify` on >10-field responses | **Blocks n8n verification** | 4 |

---

## 2. Phase 2 first: the reported customer problem

This is the phase with a named customer behind it, so it goes first in effort
even though Phase 1 is numbered lower.

The docs are unambiguous, and they explain the confusion exactly:

> Choosing `auto` tells Gamma to look at the `numCards` field […] (It will not
> adhere to text breaks `\n---\n`.) Choosing `inputTextBreaks` tells Gamma that
> it should look for text breaks `\n---\n` […] (It will not respect `numCards`.)

| `inputText` has `\n---\n`? | `cardSplit` | `numCards` | Output |
| --- | --- | --- | --- |
| No | `auto` | 9 | 9 cards |
| No | `auto` | blank | 10 cards (default) |
| **No** | **`inputTextBreaks`** | **9** | **1 card** |
| Yes, 5 | `auto` | 9 | 9 cards |
| Yes, 5 | `inputTextBreaks` | 9 | 6 cards |

The third row is the trap: pick "From text breaks", forget the separator, get one
card, and `numCards` sat there in the UI looking like it should have worked.

### 2.1 Hide `numCards` when it does nothing

`numCards` currently renders unconditionally. Gate it:

```ts
displayOptions: { show: { '/additionalOptions.cardSplit': ['auto', ''] } }
```

Two caveats to resolve during implementation:

- Both parameters live inside the `additionalOptions` collection, so the
  `displayOptions` reference needs the `/`-rooted absolute path. Verify in a live
  n8n — sibling-within-collection visibility rules are fiddly, and if it doesn't
  work the fallback is to lift `cardSplit` and `numCards` out of
  `additionalOptions` into top-level parameters, which is arguably better UX
  anyway since they are the two fields that most shape the output.
- Hiding a parameter in n8n does **not** stop it being sent if it holds a value.
  The `preSend` hook must also skip `numCards` when `cardSplit` is
  `inputTextBreaks`, so a stale value can't ride along.

### 2.2 Say what `---` does, in the UI

On `cardSplit`, per-option descriptions:

- `auto` — "Gamma decides the split and honours 'Number of Cards'. Text breaks
  are ignored."
- `inputTextBreaks` — "One card per `---` separator in Input Text. 'Number of
  Cards' is ignored, and text with no separator produces a single card."

Plus a `hint` on Input Text when `inputTextBreaks` is selected: *"Join array
items with `\n---\n` for one card per item."*

Note the separator is `\n---\n` — newline-delimited. A bare `---` mid-line is not
a break. The helper copy in the notes should say so, or people will join with
`"---"` and get one card.

### 2.3 Ship the example workflow

`examples/auto-polling-workflow.json` exists but doesn't cover this. Add
`examples/one-card-per-item.json`:

form/trigger → Code (`items.map(i => i.json.text).join('\n---\n')`) → Gamma
Create (`textMode: preserve`, `cardSplit: inputTextBreaks`) → Wait 5s → Get
Status → IF `status == completed` (else loop back) → export.

Polling cadence comes from the docs: **every 5 seconds** until `completed` or
`failed`; `gammaUrl` and `exportUrl` exist only on the completed response.

### 2.4 `textMode: preserve` deserves top billing

The notes are right that everything is `generate` + `numCards: 10`. `preserve`
is the correct mode for regulated text — doses, legal, contract clauses — where
paraphrasing is a compliance problem, not a style choice. Actions:

- Make the `preserve` option description say *why*: "Use your text verbatim.
  Choose this for content that must not be reworded — dosages, legal, contracts."
- The `preserve` + `inputTextBreaks` + `---` combination is the whole
  one-row-per-card recipe. It should be a named example, not something users
  assemble from three separate parameter descriptions.

---

## 3. Phase 1: correctness

These make the node send valid requests. Each is small and independently
verifiable.

- **A1 `imageOptions.source`.** Production enum is `aiGenerated`, `giphy`,
  `noImages`, `pexels`, `pictographic`, `placeholder`, `themeAccent`,
  `webAllImages`, `webFreeToUse`, `webFreeToUseCommercially`. Drop `unsplash`
  (not in the enum), add `pexels` and `themeAccent`.
- **A2 `folderIds`.** OpenAPI says `maxItems: 1` — "Accepts at most 1 folder ID."
  Rename to **Folder** (singular), take one value, and drop the
  `e.g. fold_abc123,fold_xyz789` placeholder that teaches the invalid shape.
  Becomes a Resource Locator in Phase 4.
- **A3 / A4 `/me` — resolved 2026-08-25.** A live call with a real key
  (`npm run test:live`) returns **200** with a genuinely useful body:
  `{ email, displayName, profileImageUrl, workspaceName, maxGenerateCards,
  availableImageModels }`. The endpoint is real, useful, and unpublished.

  The `User` resource **stays**. Its failure mode is contained: if Gamma retires
  `/me`, one read-only operation breaks rather than the node. For that same
  reason nothing else should depend on it — deriving the image-model list or the
  `numCards` cap from `/me` would put the Create operation's UI at the mercy of
  an endpoint nobody has committed to keeping.

  The credential test moving to `GET /v1.0/themes` was correct regardless: it is
  documented, cheap, and the docs name it as the way to validate a key.

  **Worth raising internally rather than fixing in code:** `maxGenerateCards` and
  `availableImageModels` are exactly the plan-dependent facts the node currently
  hardcodes — the `numCards` ceiling and which of the 40 image models a given
  workspace can actually use. If `/me` were documented, both could become
  dynamic, and that would be the single biggest accuracy win available.

  The original reasoning, written before the endpoint was confirmed:

- **A3 / A4 `/me` (original analysis).** No `/me` endpoint appears anywhere in the production docs,
  and asking the docs directly confirms it: validation should be "call a metadata
  endpoint like themes or folders". Auth runs before routing on this API, so an
  unauthenticated probe returns 401 for every path and **cannot** prove whether
  the route exists — settle it with one curl against a real key:

  ```bash
  curl -i -H "X-API-KEY: $GAMMA_API_KEY" https://public-api.gamma.app/v1.0/me
  ```

  Either way the credential test should move to `GET /v1.0/themes`, which is
  documented and cheap. If `/me` 404s, remove the `User` resource; if it works,
  it's an undocumented endpoint we shouldn't build a public node on.
- **A5 dimensions per format.** The API overrides invalid combinations and
  returns a warning. Valid sets:

  | Format | Valid dimensions |
  | --- | --- |
  | `presentation` | `16x9`, `4x3`, `fluid` |
  | `document` | `pageless`, `letter`, `a4`, `fluid` |
  | `social` | `1x1`, `4x5`, `9x16` |
  | `webpage` | `fluid` |

  Split into per-format parameters gated by `displayOptions` on `format`, so an
  invalid pair is unpickable.
- **A6 — withdrawn.** I had this down as a bug; it isn't. The node declares no
  `postReceive`, so the raw response body — `generationId`, `warnings` and
  `pageWarnings` — already becomes the node's output item. Verified by grepping
  for `postReceive`/`output:` in the node: no matches. Nothing to do.
- **A7 `exportAs`.** Add `png`.
- **A8 image models.** 46 in production vs 11 shipped, and ours bake credit costs
  into labels ("Dall-E 3 (33 Credits)") which will be wrong the moment pricing
  moves. Regenerate from the spec (§6) and move cost guidance into the parameter
  description rather than per-option labels. Worth noting several entries are
  video models (`veo-3.1`, `luma-ray-2`), so the label shouldn't say "image".
- **A9 languages.** 67 vs 18. Regenerate from the spec.
- **`numCards` bounds.** Docs: 1–60 on Pro/Teams/Business, 1–75 on Ultra. The
  node hardcodes `maxValue: 75`, which lets a Pro user submit 75 and fail. Either
  cap at 60 with the Ultra range documented, or leave 75 and say plan-dependent
  in the description. Prefer the latter — the node can't know the plan.
- **`inputText` length.** API allows 1–400,000 characters. No client-side limit
  needed, but the description should stop implying a small field.

---

## 4. Phase 3: coverage

Ordered by likely automation value, not by API layout.

1. **`title`** (1–500 chars). Trivial, and removes the need to hope the AI names
   the deck correctly — meaningful for anything filed automatically.
2. **Export an existing Gamma**: `POST /gammas/{gammaId}/export` + `GET
   /exports/{id}`. Today export is only possible *during* generation via
   `exportAs`. Re-exporting an existing deck to PDF is an obvious workflow.
3. **`GET /gammas/{gammaId}`** — metadata for a gamma. Needed to make any
   gamma-centric workflow possible at all.
4. **Standalone images**: `POST /images` + `GET /images/{id}`, plus
   `POST /images/media/{savedMediaId}/archive`. Distinct, useful, and it makes
   the 46-model list actually relevant.
5. **Multi-page `pages[]` + `publish`** — up to 50 pages in one File, published
   as a Gamma site. The biggest capability gap, and the hardest to model in n8n's
   declarative UI: `pages` is an array of objects each carrying its own
   `inputText`, `textMode`, `numCards`, `format`, `cardSplit`, `textOptions`,
   `imageOptions`, `title`, `path`. When `pages` is present it **overrides** the
   top-level equivalents, while file-level options (theme, sharing, folders,
   dimensions, export, publish) still apply.

   Realistic approach: a `fixedCollection` is painful for 50 entries, so offer a
   "Pages (JSON)" mode taking an array — which is what an n8n user producing
   pages from upstream items actually wants — and validate it client-side before
   sending. Needs a design decision (§7).
6. **Comments**: `GET /gammas/{gammaId}/comments`, cursor-paginated with an
   `updatedSince` filter. Genuinely well-suited to n8n polling workflows.
7. **Analytics** (4 endpoints: doc, per-card, per-viewer, single-viewer). Good
   reporting material. Note the permission rules — 403 without at least edit
   permission, and `manage` vs `edit` changes whether you see all viewers or only
   your own row. That needs to be in the parameter descriptions or every user
   files a bug.
8. **Archive** (`POST /gammas/{gammaId}/archive`, idempotent) and **Delete**
   (`DELETE /gammas/{gammaId}`, requires workspace admin). Delete should return
   `{"deleted": true}` per n8n's UX guidelines.

Resource layout, once expanded: `Generation`, `Gamma`, `Image`, `Export`,
`Theme`, `Folder`, `Analytics`.

---

## 5. Phase 4: n8n verification requirements

These are not polish — the first three are checked by human review and currently
fail.

- **D1 OAuth credential — implemented, pending one live check.**
  `GammaOAuth2Api` extends n8n's `oAuth2Api` and points at
  `auth.gamma.app/oauth/{authorize,token}`, with an `Authentication` parameter on
  the node selecting between API key and OAuth2.

  Two decisions worth recording. First, it registers as a **confidential client**
  (`token_endpoint_auth_method: client_secret_post`), which Gamma supports and
  n8n handles natively — this sidesteps PKCE, which n8n's generic OAuth2
  credential does not implement (the PKCE references in `n8n-workflow` belong to
  n8n's own internal trigger auth, not to `oAuth2Api`). Second, it hardcodes
  `authQueryParameters: 'resource=https://public-api.gamma.app'`; Gamma's docs
  call omitting that RFC 8707 resource indicator "the most common integration
  mistake", because the flow succeeds and then every API call fails on a
  mis-audienced token.

  **Still unverified:** nobody has completed the browser flow. It needs a client
  registered via `POST https://auth.gamma.app/oauth/register` with n8n's OAuth
  redirect URL, then one connection in the n8n UI. If Gamma turns out to require
  PKCE even for confidential clients, the generic credential will not suffice.
- **D2 Resource Locators — done.** Theme (in Additional Options), Folder, and
  the template Theme override are now `resourceLocator` parameters defaulting to
  **From List**, backed by `listSearch` methods over `GET /themes` and
  `GET /folders`. Each keeps a **By ID** mode for expressions and pasted IDs.

  The lookup honours the node's `Authentication` setting, so the pickers work
  under either credential. It requests `limit: 50` (the API maximum) and maps
  `nextCursor` to n8n's `paginationToken`, converting the API's terminal `null`
  to `undefined` — otherwise the picker pages forever.
- **D3 `Simplify` — not applicable to the current operations.** The guideline
  applies to endpoints returning more than 10 fields. Checked against the actual
  response schemas: generation status returns 8 (`generationId`, `status`,
  `gammaId`, `gammaUrl`, `exportUrl`, `credits`, `title`, `error`), `/me` returns
  6, and folder items return 2. Adding `Simplify` now would be box-ticking on
  responses that are already small. It becomes genuinely necessary with the
  Phase 3 analytics endpoints, which return 30-day daily breakdowns and per-card
  arrays — add it with them.

- **Deferred design question: list output shape.** `GET /themes` and
  `GET /folders` return `{ data, hasMore, nextCursor }`, and the node passes that
  wrapper straight through, so a list operation emits one item containing an
  array rather than one item per result. n8n convention is the latter, via
  `postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }]` —
  but that discards `nextCursor`, breaking manual pagination for anyone using the
  `after` parameter. The clean answer is auto-pagination via
  `routing.operations.pagination` plus `rootProperty`, which makes `after`
  redundant. That is a real behaviour change with a migration cost, so it is
  deliberately left for Phase 3 rather than slipped in here.
- **CRUD naming.** Rename actions to drop articles: "Create a generation" →
  "Create generation". Add `Get Many` naming where lists are returned.
- **Errors.** Map documented statuses onto actionable messages: 402 → "Workspace
  is out of credits" pointing at `gamma.app/settings/billing`; 403 on archive →
  "Use the API file ID, not the URL slug"; 403 on delete → "Requires workspace
  admin"; 429 → retry guidance. n8n's guidance is that the message says what
  happened and the description says how to fix it.
- **`gammaId` vs slug.** A documented 403 cause is passing a `gamma.app/docs/...`
  URL slug where an API file ID is required. The docs are slightly inconsistent
  here — `GET /gammas/{gammaId}` and the export endpoint both say a doc ID from
  the URL is accepted, while the error-codes page says the slug "will not work"
  and that IDs typically start with `g_`. Our placeholder says `file_abc123`,
  which matches neither. Confirm the real accepted shapes with a key, then make
  the placeholder and description match.

---

## 6. Phase 6: stop the drift

The 46-vs-11 model gap and 67-vs-18 language gap both happened because enums
were copied by hand once. The fix is to make drift fail loudly:

**Implemented.** `scripts/sync-api-enums.mjs` + `nodes/Gamma/apiEnums.ts` +
`.github/workflows/ci.yml`. Notes on how it works:

1. It reads the published OpenAPI schema
   (it is embedded in the docs pages, e.g.
   `https://developers.gamma.app/generations/create-generation.md`) and emits the
   enum arrays the node imports.
2. Add a CI job that re-runs it and fails if the committed output changes — so a
   new image model shows up as a red build, not a support ticket.
3. Delete `COMPLETE_FIELDS_LIST.md`. Replace its role with that check plus a
   short generated coverage table (endpoints implemented / total).

This also extends `test/presend.js`, which already guards parameter *paths*, into
guarding parameter *values*.

---

## 7. Decisions needed

These change the shape of the work and aren't mine to make:

1. **Scope of v0.2.** Phases 1+2 are a focused correctness-and-usability release
   and could ship this week. Phase 3 is a much larger surface. Recommend
   shipping 1+2 as `0.2.0`, then Phase 3 incrementally.
2. **Polling.** Keep the async-plus-Wait-loop pattern (matches the API, keeps
   executions short, and is what the docs describe), or add a "Wait for
   completion" toggle that polls inside the node? The toggle is friendlier but
   holds an execution open for minutes and risks n8n timeouts. Recommend
   documenting the Wait loop well and *not* blocking inside the node.
3. **Multi-page UI.** JSON array field, or a `fixedCollection` of page entries?
   Recommend JSON, because the realistic use case generates pages from upstream
   items rather than hand-authoring them.
4. **OAuth priority.** Needed for verification, but it's the largest single item
   in Phase 4. Confirm whether verification is still the goal before investing.
5. ~~**`/me`.** One curl with a real key settles A3/A4.~~ **Resolved
   2026-08-25:** returns 200 with `maxGenerateCards` and
   `availableImageModels`. The `User` resource stays; nothing else should depend
   on it while it is undocumented. Getting it documented would let the node
   derive plan limits and the usable model list dynamically — worth raising
   internally.

---

## 8. Suggested sequencing

| Release | Contents | Rough shape |
| --- | --- | --- |
| `0.1.5` | Already-fixed parameter-path bug (B6 in the readiness audit) + provenance publish | Ready now, pending Trusted Publishers |
| `0.2.0` | Phase 1 (correctness) + Phase 2 (the card-split work, helper copy, example workflow) | Small, high value, unblocks the reported customer |
| `0.3.0` | Phase 6 (enum sync + CI) + Phase 4 Resource Locators, Simplify, error mapping, action renames | Makes the node verification-shaped |
| `0.4.0` | Phase 3 coverage: title, export, get gamma, images | Capability expansion |
| `0.5.0` | Multi-page + publish, comments, analytics, archive/delete | The long tail |
| — | OAuth credential, then Creator Portal submission | Gated on decision 4 |

Ship `0.1.5` first regardless: the current published `0.1.4` has the
optional-parameter bug *and* no provenance, so every day it stays latest is a day
users hit `Could not get parameter`.
