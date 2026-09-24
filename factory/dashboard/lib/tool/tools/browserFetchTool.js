'use strict';

/**
 * browser.fetch — the second real external-information tool (this phase's item 7/8). Fetches one
 * URL and returns its content as inert data. Deliberately narrow: no cookies/credentials are ever
 * attached, no JavaScript is executed, no form is submitted, no arbitrary HTTP method/header is
 * exposed to the caller — this is read-only retrieval, not browser automation.
 *
 * The default implementation performs a real HTTP(S) fetch using Node's built-in `fetch` (no new
 * dependency). It is not exercised by this factory's own offline automated test suite — every
 * test injects a fake `fetchImpl` instead, the same discipline Phase 2's mock-provider and this
 * tool's sibling browser.search already use, so `npm test` stays network-free. The real path
 * exists and is reviewed here, but its live behavior against the actual internet has not been
 * separately verified in this pass (see the Phase 4 report's Known Limitations).
 */

const { defineTool } = require('../Tool');
const { RESULT_STATUS, ToolTechnicalError } = require('../types');

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const DEFAULT_MAX_CONTENT_CHARS = 200_000;
const DEFAULT_FETCH_TIMEOUT_MS = 7000;

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

/** Real default implementation: Node's global fetch, capped response size, bounded timeout via
 * AbortController. Never attaches credentials/cookies; never executes response content. */
async function defaultFetchImpl(url, { maxContentChars = DEFAULT_MAX_CONTENT_CHARS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal, credentials: 'omit' });
    const contentType = response.headers.get('content-type') || 'unknown';
    const fullText = await response.text();
    const truncated = fullText.length > maxContentChars;
    const content = truncated ? fullText.slice(0, maxContentChars) : fullText;
    const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(content);
    return {
      url,
      final_url: response.url || url,
      title: titleMatch ? titleMatch[1].trim() : null,
      retrieved_at: new Date().toISOString(),
      content,
      content_type: contentType,
      truncated,
      http_status: response.status,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {object} [options]
 * @param {function} [options.fetchImpl] - async (url, { maxContentChars }) => { url, final_url,
 *   title, retrieved_at, content, content_type, truncated, http_status }. Defaults to
 *   defaultFetchImpl above.
 */
function createBrowserFetchTool({ fetchImpl = defaultFetchImpl } = {}) {
  return defineTool({
    tool_id: 'browser.fetch',
    tool_type: 'browser',
    version: '1.0.0',
    description: 'Fetches one URL and returns its content as inert data. Read-only; no credentials, no script execution, no form submission.',
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
      let result;
      try {
        result = await fetchImpl(input.url, { maxContentChars: DEFAULT_MAX_CONTENT_CHARS });
      } catch (e) {
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
        },
      };
    },
  });
}

module.exports = { createBrowserFetchTool, defaultFetchImpl, ALLOWED_PROTOCOLS };
