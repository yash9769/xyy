'use strict';

/**
 * The only door an agent has into the existing lifecycle state machine (doc 07 §13/§19,
 * doc 26 §14). This does not add a second way to mutate state — it is a thin, hardcoded-actor
 * wrapper around store.transition(), which remains the sole writer and remains gated by
 * stateMachine.js exactly as it is for the dashboard and CLI.
 *
 * Deliberately: this function does NOT accept an `actor` parameter at all. There is no way to
 * call this and have it pass through anything other than actor: 'AGENT' — an agent requesting a
 * HUMAN-only transition (e.g. APPROVE_OPPORTUNITY) will get the same InvalidTransitionError any
 * other AGENT-actor caller would get from store.js/stateMachine.js. This is what makes "an agent
 * can never claim actor=HUMAN" true structurally rather than by convention.
 */

const store = require('../store');

function requestLifecycleTransition({ id, action, reason, note, actorName }) {
  if (typeof id !== 'string' || !id) {
    throw new TypeError('requestLifecycleTransition requires an opportunity id');
  }
  if (typeof action !== 'string' || !action) {
    throw new TypeError('requestLifecycleTransition requires an action');
  }
  // actor is intentionally not a parameter of this function's signature — see file header.
  return store.transition({
    id,
    action,
    actor: 'AGENT',
    reason,
    note,
    actorName: actorName || 'agent',
  });
}

module.exports = { requestLifecycleTransition };
