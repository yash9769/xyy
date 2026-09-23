'use strict';

/**
 * Deterministic routing policy (doc 08 §4/§6, this phase's items 5/6). Given identical inputs
 * (registry contents, required capabilities, budget, excluded models), selectModel() always
 * returns the same model — no randomness, no time/environment dependence, no model-controlled
 * selection.
 *
 * Explicit, documented order (this phase's item 6 requires either following a documented policy
 * or defining one explicitly when the docs don't specify a tie-breaker — doc 08 §4 lists the
 * *criteria* but not an exact order, so this is that order, stated plainly):
 *
 *   1. Must declare every required capability (missing any is disqualifying).
 *   2. Must be marked available (available !== false).
 *   3. If a budget (maxCostUsd) is given, must have a KNOWN costPerCallUsd <= maxCostUsd —
 *      a model with no cost metadata at all is never treated as free, so it is excluded whenever
 *      a budget constraint is present (not merely deprioritized).
 *   4. Among the remaining eligible models, sort by: priority ascending (lower = preferred),
 *      then costPerCallUsd ascending (unknown cost sorts last, as +Infinity, only reachable when
 *      no budget constraint was given), then model_id ascending (a plain string comparison) as
 *      the final, always-available tie-breaker.
 *   5. Return the first model in that order.
 */

const { BLOCK_REASON } = require('./types');

/**
 * @param {ModelRegistry} modelRegistry
 * @param {object} options
 *   requiredCapabilities: string[]
 *   maxCostUsd: number | undefined
 *   excludeModelIds: string[] | undefined — models to skip (used for fallback attempts)
 * @returns {{ model: object|null, blockReason: string|null }}
 */
function selectModel(modelRegistry, { requiredCapabilities, maxCostUsd, excludeModelIds = [] }) {
  const excluded = new Set(excludeModelIds);
  const all = modelRegistry.list().filter((m) => !excluded.has(m.model_id));

  const capable = all.filter((m) => requiredCapabilities.every((cap) => m.capabilities.includes(cap)));
  if (capable.length === 0) {
    return { model: null, blockReason: BLOCK_REASON.NO_MODEL_SUPPORTS_REQUIRED_CAPABILITIES };
  }

  const available = capable.filter((m) => m.available !== false);
  if (available.length === 0) {
    return { model: null, blockReason: BLOCK_REASON.NO_AVAILABLE_MODEL };
  }

  let candidates = available;
  if (maxCostUsd !== undefined && maxCostUsd !== null) {
    // A model with no cost metadata is never treated as free — it is excluded, not preferred,
    // whenever a budget constraint applies.
    candidates = available.filter((m) => m.costPerCallUsd !== undefined && m.costPerCallUsd <= maxCostUsd);
    if (candidates.length === 0) {
      return { model: null, blockReason: BLOCK_REASON.BUDGET_EXCEEDED };
    }
  }

  const sorted = [...candidates].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const costA = a.costPerCallUsd ?? Infinity;
    const costB = b.costPerCallUsd ?? Infinity;
    if (costA !== costB) return costA - costB;
    return a.model_id.localeCompare(b.model_id);
  });

  return { model: sorted[0], blockReason: null };
}

module.exports = { selectModel };
