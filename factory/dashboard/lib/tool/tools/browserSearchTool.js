'use strict';

/**
 * browser.search — the first real external-information tool (this phase's item 7). Its contract
 * is real and enforced; its *provider* is intentionally not wired to a live search API in this
 * phase (no API key is introduced anywhere in this factory, per every prior phase's security
 * rule) — by default it returns BLOCKED: SEARCH_PROVIDER_NOT_CONFIGURED. A real search backend
 * can be plugged in later purely by passing a `searchImpl` at construction; this is exactly the
 * same "mock now, real provider later behind an unchanged interface" pattern the Model Router
 * (Phase 2) already established with mock-provider.
 *
 * Every result returned by `searchImpl` is treated as untrusted external data — it flows into
 * Source/Evidence records as inert text (see factory/dashboard/lib/research/), never as
 * instructions this tool or its caller executes.
 */

const { defineTool } = require('../Tool');
const { RESULT_STATUS, ToolTechnicalError, BLOCK_REASON } = require('../types');

const MAX_QUERY_LENGTH = 300;
const DEFAULT_MAX_RESULTS = 5;
const HARD_MAX_RESULTS = 20;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {object} [options]
 * @param {function} [options.searchImpl] - async (query, { maxResults }) => Array<{result_id,
 *   title, url, snippet, source, retrieved_at}>. Omit to get the safe "not configured" default.
 */
function createBrowserSearchTool({ searchImpl } = {}) {
  return defineTool({
    tool_id: 'browser.search',
    tool_type: 'browser',
    version: '1.0.0',
    description: 'Structured web search. Read-only; results are untrusted external data.',
    permissions: ['external_read'],
    side_effect_level: 'READ_ONLY',
    allowedActors: ['AGENT', 'SYSTEM'],
    timeoutMs: 8000,
    retryPolicy: { maxRetries: 1 },
    validateInput(input) {
      if (!isPlainObject(input)) throw new TypeError('browser.search input must be a plain object');
      if (typeof input.query !== 'string' || input.query.trim() === '') {
        throw new TypeError('browser.search requires a non-empty string "query"');
      }
      if (input.query.length > MAX_QUERY_LENGTH) {
        throw new TypeError(`browser.search "query" exceeds the ${MAX_QUERY_LENGTH}-character limit`);
      }
      const maxResults = input.maxResults === undefined ? DEFAULT_MAX_RESULTS : input.maxResults;
      if (!Number.isInteger(maxResults) || maxResults <= 0 || maxResults > HARD_MAX_RESULTS) {
        throw new TypeError(`browser.search "maxResults" must be an integer between 1 and ${HARD_MAX_RESULTS}`);
      }
      return { query: input.query, maxResults };
    },
    async execute(input) {
      if (!searchImpl) {
        return {
          status: RESULT_STATUS.BLOCKED,
          block_reason: `${BLOCK_REASON.SEARCH_PROVIDER_NOT_CONFIGURED}: no search provider is configured for this environment`,
        };
      }
      let results;
      try {
        results = await searchImpl(input.query, { maxResults: input.maxResults });
      } catch (e) {
        // Any exception from an external search call is treated as a technical failure — the
        // same posture Phase 2's mock-provider takes for provider errors.
        throw new ToolTechnicalError(`browser.search: search provider error: ${e.message}`);
      }
      if (!Array.isArray(results)) {
        // Malformed provider output is not a technical failure — it's a contract violation,
        // caught here as a non-retryable FAILED via the normal output-validation path.
        return { status: RESULT_STATUS.FAILED, errors: ['browser.search: search provider returned a non-array result set'] };
      }
      return { status: RESULT_STATUS.SUCCESS, output: { results: results.slice(0, input.maxResults) } };
    },
  });
}

module.exports = { createBrowserSearchTool };
