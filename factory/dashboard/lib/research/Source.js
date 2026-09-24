'use strict';

/**
 * Source — where a piece of evidence came from (this phase's item 9). Unknown fields are left
 * `null`, never hallucinated: if a fetch didn't return a title/publisher, that's what the record
 * says, rather than inventing one.
 */

const { SOURCE_TYPES, ResearchValidationError } = require('./types');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDateString(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/**
 * @param {object} input
 *   source_id: string (required)
 *   source_type: one of SOURCE_TYPES (required)
 *   url: string | null
 *   title: string | null
 *   publisher: string | null
 *   retrieved_at: ISO date string (required)
 *   content_hash: string | null
 *   locator: string | null
 *   trust_notes: string (default '')
 */
function createSource(input) {
  if (!isPlainObject(input)) {
    throw new ResearchValidationError('Source input must be a plain object');
  }
  const { source_id, source_type, url, title, publisher, retrieved_at, content_hash, locator, trust_notes } = input;

  if (typeof source_id !== 'string' || source_id.trim() === '') {
    throw new ResearchValidationError('Source requires a non-empty string source_id');
  }
  if (typeof source_type !== 'string' || !SOURCE_TYPES.includes(source_type)) {
    throw new ResearchValidationError(`Source.source_type must be one of ${SOURCE_TYPES.join(', ')}, got ${JSON.stringify(source_type)}`);
  }
  if (url !== undefined && url !== null) {
    if (typeof url !== 'string') {
      throw new ResearchValidationError('Source.url must be a string or null');
    }
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch (e) {
      throw new ResearchValidationError(`Source.url is malformed: ${url}`);
    }
  }
  if (!isIsoDateString(retrieved_at)) {
    throw new ResearchValidationError('Source requires a valid ISO date string retrieved_at');
  }
  for (const [key, val] of [['title', title], ['publisher', publisher], ['content_hash', content_hash], ['locator', locator]]) {
    if (val !== undefined && val !== null && typeof val !== 'string') {
      throw new ResearchValidationError(`Source.${key} must be a string or null when provided`);
    }
  }
  if (trust_notes !== undefined && typeof trust_notes !== 'string') {
    throw new ResearchValidationError('Source.trust_notes must be a string when provided');
  }

  return Object.freeze({
    source_id,
    source_type,
    url: url ?? null,
    title: title ?? null,
    publisher: publisher ?? null,
    retrieved_at,
    content_hash: content_hash ?? null,
    locator: locator ?? null,
    trust_notes: trust_notes ?? '',
  });
}

module.exports = { createSource };
