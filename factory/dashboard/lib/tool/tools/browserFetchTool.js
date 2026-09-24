'use strict';

/**
 * browser.fetch — the second real external-information tool (Phase 4 item 7/8, remediated per
 * the Phase 4 security follow-up). Fetches one URL and returns its content as inert data.
 * Deliberately narrow: no cookies/credentials are ever attached, no JavaScript is executed, no
 * form is submitted, no arbitrary HTTP method/header is exposed to the caller — this is
 * read-only retrieval, not browser automation.
 *
 * SECURITY BOUNDARY (SSRF / private-network protection):
 *
 *   untrusted URL -> parse -> resolve destination -> validate destination
 *       -> reject private/loopback/link-local -> only then fetch
 *
 * This check runs in execute() for EVERY request — including when a caller supplies a custom
 * `fetchImpl` (e.g. in tests) — so the boundary cannot be skipped by swapping the fetch
 * implementation. The real default implementation additionally re-validates the destination of
 * every redirect hop before following it (manual redirect handling, bounded to
 * MAX_REDIRECTS), so a malicious server cannot use a redirect to reach a private address that
 * the initial-URL check would have blocked outright.
 *
 * The default implementation performs real HTTP(S) fetches and real DNS resolution using Node's
 * built-ins (`fetch`, `dns`) — no new dependency. It is not exercised end-to-end against the
 * live internet by this factory's own offline automated test suite; tests inject fake
 * `resolveImpl`/`rawFetch` functions to exercise the *real* validation and redirect-handling
 * code paths deterministically and offline (see browserTools.test.js).
 */

const dns = require('dns');
const net = require('net');
const { defineTool } = require('../Tool');
const { RESULT_STATUS, ToolTechnicalError } = require('../types');

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const DEFAULT_MAX_CONTENT_CHARS = 200_000;
const DEFAULT_FETCH_TIMEOUT_MS = 7000;
const MAX_REDIRECTS = 5;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAndValidateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    throw new TypeError(`browser.fetch: malformed URL: ${rawUrl}`);
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new TypeError(`browser.fetch: unsupported protocol '${parsed.protocol}' — only http:/https: are allowed (no file:, javascript:, data:, etc.)`);
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// SSRF / private-network destination validation
// ---------------------------------------------------------------------------

class UnsafeDestinationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafeDestinationError';
  }
}

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true; // malformed -> treat as unsafe
  const [a, b] = parts;
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

/** Extracts the trailing dotted-quad from an IPv4-mapped/compatible IPv6 address, if present. */
function extractEmbeddedIPv4(ip) {
  const match = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(ip);
  return match ? match[1] : null;
}

function isPrivateIPv6(rawIp) {
  const ip = rawIp.toLowerCase();
  if (ip === '::1' || ip === '::') return true; // loopback / unspecified
  const firstGroup = ip.split(':')[0];
  if (/^fe[89ab][0-9a-f]?$/.test(firstGroup) || /^fe8/.test(firstGroup) || /^fe9/.test(firstGroup) || /^fea/.test(firstGroup) || /^feb/.test(firstGroup)) {
    return true; // fe80::/10 link-local
  }
  if (/^f[cd][0-9a-f]{0,2}$/.test(firstGroup)) return true; // fc00::/7 unique local
  const embedded = extractEmbeddedIPv4(ip);
  if (embedded && isPrivateIPv4(embedded)) return true; // ::ffff:127.0.0.1 etc.
  return false;
}

function stripBrackets(hostname) {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function isUnsafeHostnameLiteral(hostname) {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0' || h === '0';
}

function isUnsafeAddress(address, family) {
  if (family === 6 || net.isIPv6(address)) return isPrivateIPv6(address);
  return isPrivateIPv4(address);
}

/** Real default resolver: Node's dns.lookup, promisified inline (no new dependency). */
function defaultResolveImpl(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses); // [{ address, family }, ...]
    });
  });
}

/**
 * Throws UnsafeDestinationError if `urlString`'s host is (or resolves to) a private, loopback,
 * link-local, or otherwise local-only destination. Never exposes the resolved address in the
 * thrown message beyond what's needed to explain the block — no internal IP is echoed back to
 * the caller (see the ToolResult mapping in execute(), which further reduces this to a generic
 * reason).
 */
async function assertSafeDestination(urlString, resolveImpl) {
  const parsed = new URL(urlString);
  const hostname = stripBrackets(parsed.hostname);

  if (isUnsafeHostnameLiteral(hostname)) {
    throw new UnsafeDestinationError('destination resolves to a local-only hostname');
  }

  if (net.isIP(hostname)) {
    if (isUnsafeAddress(hostname, net.isIPv6(hostname) ? 6 : 4)) {
      throw new UnsafeDestinationError('destination is a private/loopback/link-local IP address');
    }
    return;
  }

  let addresses;
  try {
    addresses = await resolveImpl(hostname);
  } catch (e) {
    // DNS resolution failure is a technical fetch problem, not a safety verdict — let it surface
    // as a normal technical failure from the fetch step rather than a safety rejection.
    throw new ToolTechnicalError(`browser.fetch: DNS resolution failed for '${hostname}': ${e.message}`);
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new ToolTechnicalError(`browser.fetch: DNS resolution returned no addresses for '${hostname}'`);
  }
  for (const { address, family } of addresses) {
    if (isUnsafeAddress(address, family)) {
      throw new UnsafeDestinationError('destination hostname resolves to a private/loopback/link-local address');
    }
  }
}

// ---------------------------------------------------------------------------
// Real fetch implementation: manual, per-hop-validated redirect handling
// ---------------------------------------------------------------------------

/**
 * @param {object} options
 * @param {string} options.url
 * @param {function} options.resolveImpl - async (hostname) => [{address, family}, ...]
 * @param {function} options.rawFetch - the low-level fetch primitive, signature matching the
 *   global `fetch(url, init)`. Injectable so the redirect-validation loop itself can be tested
 *   offline without a real network call.
 * @param {number} [options.maxContentChars]
 */
async function performValidatedFetch({ url, resolveImpl, rawFetch, maxContentChars = DEFAULT_MAX_CONTENT_CHARS }) {
  let currentUrl = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertSafeDestination(currentUrl, resolveImpl); // validated on every hop, including the first

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await rawFetch(currentUrl, { redirect: 'manual', signal: controller.signal, credentials: 'omit' });
    } finally {
      clearTimeout(timer);
    }

    const isRedirect = response.status >= 300 && response.status < 400 && response.headers.get('location');
    if (isRedirect) {
      currentUrl = new URL(response.headers.get('location'), currentUrl).toString();
      if (!ALLOWED_PROTOCOLS.has(new URL(currentUrl).protocol)) {
        throw new UnsafeDestinationError('redirect target uses an unsupported protocol');
      }
      continue; // loop back and validate the new destination before following it
    }

    const contentType = response.headers.get('content-type') || 'unknown';
    const fullText = typeof response.text === 'function' ? await response.text() : '';
    const truncated = fullText.length > maxContentChars;
    const content = truncated ? fullText.slice(0, maxContentChars) : fullText;
    const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(content);
    return {
      url,
      final_url: currentUrl,
      title: titleMatch ? titleMatch[1].trim() : null,
      retrieved_at: new Date().toISOString(),
      content,
      content_type: contentType,
      truncated,
      http_status: response.status,
    };
  }
  throw new ToolTechnicalError('browser.fetch: too many redirects');
}

function buildDefaultFetchImpl({ resolveImpl = defaultResolveImpl, rawFetch = fetch } = {}) {
  return (url, opts) => performValidatedFetch({ url, resolveImpl, rawFetch, ...opts });
}

/**
 * @param {object} [options]
 * @param {function} [options.fetchImpl] - async (url, { maxContentChars }) => { url, final_url,
 *   title, retrieved_at, content, content_type, truncated, http_status }. When provided, this
 *   REPLACES the real fetch implementation (e.g. for tests exercising the outer tool contract),
 *   but the SSRF destination check on the initial URL still runs in execute() regardless.
 * @param {function} [options.resolveImpl] - async (hostname) => [{address, family}, ...].
 *   Defaults to real DNS resolution; only used for the initial-URL check (and, when `fetchImpl`
 *   is omitted, for every redirect hop inside the real implementation too).
 * @param {function} [options.rawFetch] - low-level fetch primitive used only by the real default
 *   implementation's redirect loop (ignored if `fetchImpl` is provided).
 */
function createBrowserFetchTool({ fetchImpl, resolveImpl = defaultResolveImpl, rawFetch = fetch } = {}) {
  const effectiveFetchImpl = fetchImpl || buildDefaultFetchImpl({ resolveImpl, rawFetch });

  return defineTool({
    tool_id: 'browser.fetch',
    tool_type: 'browser',
    version: '1.1.0',
    description: 'Fetches one URL and returns its content as inert data. Read-only; no credentials, no script execution, no form submission, no private/local network access.',
    permissions: ['external_read'],
    side_effect_level: 'READ_ONLY',
    allowedActors: ['AGENT', 'SYSTEM'],
    timeoutMs: 8000,
    retryPolicy: { maxRetries: 1 },
    validateInput(input) {
      if (!isPlainObject(input)) throw new TypeError('browser.fetch input must be a plain object');
      if (typeof input.url !== 'string' || input.url.trim() === '') {
        throw new TypeError('browser.fetch requires a non-empty string "url"');
      }
      parseAndValidateUrl(input.url); // throws on malformed URL or disallowed protocol
      return { url: input.url };
    },
    async execute(input) {
      // The SSRF boundary: always runs, regardless of which fetchImpl ends up serving the
      // request, and before that implementation is ever invoked.
      try {
        await assertSafeDestination(input.url, resolveImpl);
      } catch (e) {
        if (e instanceof UnsafeDestinationError) {
          // No internal IP, resolver detail, or environment information is included — only a
          // fixed, generic reason.
          return { status: RESULT_STATUS.BLOCKED, block_reason: 'UNSAFE_NETWORK_DESTINATION: this destination is not permitted (private, loopback, or link-local network)' };
        }
        throw e; // a DNS/technical failure — handled by the normal fetch-failure path below
      }

      let result;
      try {
        result = await effectiveFetchImpl(input.url, { maxContentChars: DEFAULT_MAX_CONTENT_CHARS });
      } catch (e) {
        if (e instanceof UnsafeDestinationError) {
          // A redirect hop (inside the real implementation) landed on an unsafe destination.
          return { status: RESULT_STATUS.BLOCKED, block_reason: 'UNSAFE_NETWORK_DESTINATION: a redirect targeted a destination that is not permitted' };
        }
        throw new ToolTechnicalError(`browser.fetch: fetch failed: ${e.message}`);
      }
      if (!isPlainObject(result) || typeof result.content !== 'string') {
        return { status: RESULT_STATUS.FAILED, errors: ['browser.fetch: fetch implementation returned a malformed result'] };
      }
      return {
        status: RESULT_STATUS.SUCCESS,
        output: {
          url: result.url ?? input.url,
          final_url: result.final_url ?? input.url,
          title: result.title ?? null,
          retrieved_at: result.retrieved_at ?? new Date().toISOString(),
          content: result.content,
          content_type: result.content_type ?? 'unknown',
          truncated: result.truncated === true,
          // HTTP status is preserved and passed through untouched — a 404/500 is still a
          // successful *fetch* (we retrieved a real, structured response); research code decides
          // what a non-2xx status means, this tool does not silently convert it into a failure.
          http_status: typeof result.http_status === 'number' ? result.http_status : null,
        },
      };
    },
  });
}

module.exports = {
  createBrowserFetchTool,
  buildDefaultFetchImpl,
  performValidatedFetch,
  assertSafeDestination,
  isPrivateIPv4,
  isPrivateIPv6,
  isUnsafeHostnameLiteral,
  UnsafeDestinationError,
  ALLOWED_PROTOCOLS,
  MAX_REDIRECTS,
};
