'use strict';

/**
 * ProductSpecification persistence — one append-only JSONL log, same convention as
 * research/persistence.js and the agent/model/tool run logs (fs.appendFileSync, one JSON object per
 * line, never edited in place). It is never read as lifecycle authority; opportunity.json via
 * store.js remains the only lifecycle state.
 *
 * Immutability/versioning rules enforced on append:
 * - only objects produced by createProductSpecification() (validated + frozen) are accepted;
 * - specification_id must be unique;
 * - version must be exactly the next version for that opportunity (1, 2, 3, ... no gaps/reuse).
 *
 * Reads fail closed: a malformed line raises ProductPersistenceError rather than being skipped, so
 * a corrupted log can never make a version number be silently reused.
 */

const fs = require('fs');
const path = require('path');
const { isValidatedProductSpecification } = require('./ProductSpecification');
const { ProductPersistenceError } = require('./types');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PRODUCT_SPECIFICATIONS_LOG_PATH = path.join(REPO_ROOT, 'factory', 'state', 'product', 'product-specifications.jsonl');

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function createProductSpecificationStore({ logPath = PRODUCT_SPECIFICATIONS_LOG_PATH } = {}) {
  /** All persisted specifications in file (append) order. */
  function readInOrder() {
    if (!fs.existsSync(logPath)) return [];
    const lines = fs.readFileSync(logPath, 'utf8').split('\n');
    const records = [];
    lines.forEach((line, i) => {
      if (line.trim() === '') return;
      let record;
      try {
        record = JSON.parse(line);
      } catch (e) {
        throw new ProductPersistenceError(`${logPath}: line ${i + 1} is not valid JSON (${e.message})`);
      }
      if (!record || typeof record.specification_id !== 'string' || typeof record.opportunity_id !== 'string' || !Number.isInteger(record.version)) {
        throw new ProductPersistenceError(`${logPath}: line ${i + 1} is not a ProductSpecification record`);
      }
      records.push(deepFreeze(record));
    });
    return records;
  }

  /** Newest-first, mirroring auditLog.readAll()/readResearchRecords(). */
  function readAll() {
    return readInOrder().reverse();
  }

  function forOpportunity(opportunityId) {
    return readInOrder().filter((r) => r.opportunity_id === opportunityId);
  }

  function nextVersion(opportunityId) {
    return forOpportunity(opportunityId).reduce((max, r) => Math.max(max, r.version), 0) + 1;
  }

  function getLatestForOpportunity(opportunityId) {
    return forOpportunity(opportunityId).reduce((latest, r) => (!latest || r.version > latest.version ? r : latest), null);
  }

  function getById(specificationId) {
    return readInOrder().find((r) => r.specification_id === specificationId) || null;
  }

  function getByVersion(opportunityId, version) {
    return forOpportunity(opportunityId).find((r) => r.version === version) || null;
  }

  function append(specification) {
    if (!isValidatedProductSpecification(specification)) {
      throw new ProductPersistenceError('only a validated ProductSpecification (from createProductSpecification) may be persisted');
    }
    const existing = readInOrder();
    if (existing.some((r) => r.specification_id === specification.specification_id)) {
      throw new ProductPersistenceError(`specification '${specification.specification_id}' already exists; specifications are immutable`);
    }
    const expected = existing.filter((r) => r.opportunity_id === specification.opportunity_id).reduce((max, r) => Math.max(max, r.version), 0) + 1;
    if (specification.version !== expected) {
      throw new ProductPersistenceError(`version ${specification.version} for '${specification.opportunity_id}' is not the next version (${expected})`);
    }
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const entry = { recorded_at: new Date().toISOString(), ...specification };
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    return deepFreeze(entry);
  }

  return { append, readAll, nextVersion, getLatestForOpportunity, getById, getByVersion, logPath };
}

const defaultStore = createProductSpecificationStore();

module.exports = {
  createProductSpecificationStore,
  defaultStore,
  PRODUCT_SPECIFICATIONS_LOG_PATH,
};
