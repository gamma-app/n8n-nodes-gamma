/**
 * The `User-Agent` every request from this node carries.
 *
 * Gamma's public-API analytics bucket inbound traffic on the product token
 * before the `/`, and n8n stamps its own default UA — the legacy string `n8n`,
 * or `Mozilla/5.0 (compatible; n8n/<version>; +https://n8n.io/)` once an
 * instance sets `enforceGlobalUserAgent` — onto any request that doesn't set
 * one. Both of those bucket this node in with hand-rolled HTTP Request nodes
 * calling Gamma, and the Mozilla form doesn't read as n8n at all.
 *
 * n8n's `applyDefaultOutboundUserAgent` skips a request that already has the
 * header, so setting it here wins. The `n8n-` prefix keeps us inside an
 * `n8n%`-style family match while still giving the node its own bucket.
 *
 * VERSION must track package.json — `test/user-agent.test.js` fails the build
 * if it drifts.
 */
const VERSION = '0.5.3';

export const USER_AGENT = `n8n-nodes-gamma/${VERSION}`;
