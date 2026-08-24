# Example workflows

Import a file from this folder into n8n via **Workflows → Import from File**, then
point the Gamma nodes at your own credential.

Both examples are validated against the node's real schema by `npm test`, so the
node type, parameter names and enum values here are guaranteed to match the
version of the node in this repo.

## `one-card-per-item.json` — one card per row or array item

The pattern for turning CRM rows, form submissions or any list into a deck where
each item gets its own card.

The mechanics matter, and they are easy to get wrong:

- Gamma splits on a line containing only `---`, i.e. the separator is `\n---\n`.
  A bare `---` in the middle of a line is not a break.
- That split only happens when **Card Split** is `Input Text Breaks`. In that
  mode **Number of Cards is ignored** — and if your text contains no separator
  at all you get a *single* card, which usually looks like a bug rather than a
  setting.
- N separators produce N+1 cards. So `join`, don't wrap: joining 6 rows with
  `\n---\n` gives 5 separators and 6 cards.

The workflow uses **Text Mode: Preserve** as well, which keeps your wording
exactly as supplied. That is the right choice whenever the text must not be
reworded — dosages, legal terms, contract clauses, pricing.

The Code node is the whole trick:

```js
const blocks = $input.all()
  .map((item) => String(item.json.text ?? '').trim())
  .filter((text) => text.length > 0);

return [{ json: { inputText: blocks.join('\n---\n'), cardCount: blocks.length } }];
```

Swap `item.json.text` for whichever field holds your row content.

## `auto-polling-workflow.json` — generate and wait for the result

Generation is asynchronous: `Create` returns a `generationId` immediately, and
`gammaUrl` / `exportUrl` only exist once the status is `completed`.

This workflow polls `Get Status` every 5 seconds (the interval Gamma's docs
recommend) and loops until the status stops being `pending`. Give the loop a
sensible ceiling for your own use — a long generation can take a few minutes.

Statuses are `pending`, `completed` and `failed`. On `failed`, read the `error`
object rather than retrying.
