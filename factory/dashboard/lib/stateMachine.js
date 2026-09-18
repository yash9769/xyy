'use strict';

/**
 * The App Factory's formal opportunity/app lifecycle. This is the single source of truth for
 * what transitions are legal — the dashboard API and the CLI bridge both call validate() here
 * rather than each deciding for themselves what's allowed.
 *
 * Actors: HUMAN (a person clicked a button or ran a CLI command), AGENT (Claude/automation
 * performed a non-gated step), SYSTEM (the factory itself, e.g. a scheduled state change).
 *
 * Every transition into an AWAITING_* state is agent/system work; every transition OUT of an
 * AWAITING_* state is a hard gate — only HUMAN may perform it. This is enforced in code, not
 * just by convention.
 */

const STATES = Object.freeze([
  'DISCOVERED',
  'RESEARCHING',
  'RESEARCH_COMPLETE',
  'AWAITING_OPPORTUNITY_APPROVAL',
  'REJECTED',
  'APPROVED',
  'SPEC_GENERATING',
  'AWAITING_SPEC_APPROVAL',
  'BUILDING',
  'TESTING',
  'SECURITY_REVIEW',
  'RELEASE_CANDIDATE',
  'AWAITING_RELEASE_APPROVAL',
  'INTERNAL_TEST',
  'AWAITING_PRODUCTION_APPROVAL',
  'PUBLISHED',
  'MONITORING',
  'ITERATION_PROPOSED',
  'PAUSED',
  'KILLED',
]);

const ACTORS = Object.freeze(['HUMAN', 'AGENT', 'SYSTEM']);

// Each entry: fromState -> { action: { to, allowedActors } }
const TRANSITIONS = {
  DISCOVERED: {
    START_RESEARCH: { to: 'RESEARCHING', allowedActors: ['AGENT', 'HUMAN'] },
  },
  RESEARCHING: {
    COMPLETE_RESEARCH: { to: 'RESEARCH_COMPLETE', allowedActors: ['AGENT'] },
  },
  RESEARCH_COMPLETE: {
    SUBMIT_FOR_APPROVAL: { to: 'AWAITING_OPPORTUNITY_APPROVAL', allowedActors: ['AGENT'] },
  },
  AWAITING_OPPORTUNITY_APPROVAL: {
    APPROVE_OPPORTUNITY: { to: 'APPROVED', allowedActors: ['HUMAN'] },
    REJECT_OPPORTUNITY: { to: 'REJECTED', allowedActors: ['HUMAN'] },
    NEED_MORE_RESEARCH: { to: 'RESEARCHING', allowedActors: ['HUMAN'] },
  },
  APPROVED: {
    START_SPEC: { to: 'SPEC_GENERATING', allowedActors: ['AGENT', 'HUMAN'] },
  },
  SPEC_GENERATING: {
    SUBMIT_SPEC_FOR_APPROVAL: { to: 'AWAITING_SPEC_APPROVAL', allowedActors: ['AGENT'] },
  },
  AWAITING_SPEC_APPROVAL: {
    APPROVE_SPEC: { to: 'BUILDING', allowedActors: ['HUMAN'] },
    REJECT_SPEC: { to: 'REJECTED', allowedActors: ['HUMAN'] },
  },
  BUILDING: {
    COMPLETE_BUILD: { to: 'TESTING', allowedActors: ['AGENT'] },
  },
  TESTING: {
    COMPLETE_TESTING: { to: 'SECURITY_REVIEW', allowedActors: ['AGENT'] },
  },
  SECURITY_REVIEW: {
    COMPLETE_SECURITY_REVIEW: { to: 'RELEASE_CANDIDATE', allowedActors: ['AGENT'] },
  },
  RELEASE_CANDIDATE: {
    SUBMIT_RELEASE_FOR_APPROVAL: { to: 'AWAITING_RELEASE_APPROVAL', allowedActors: ['AGENT'] },
  },
  AWAITING_RELEASE_APPROVAL: {
    APPROVE_RELEASE: { to: 'INTERNAL_TEST', allowedActors: ['HUMAN'] },
    REJECT_RELEASE: { to: 'BUILDING', allowedActors: ['HUMAN'] },
  },
  INTERNAL_TEST: {
    SUBMIT_FOR_PRODUCTION_APPROVAL: { to: 'AWAITING_PRODUCTION_APPROVAL', allowedActors: ['AGENT', 'HUMAN'] },
  },
  AWAITING_PRODUCTION_APPROVAL: {
    APPROVE_PRODUCTION: { to: 'PUBLISHED', allowedActors: ['HUMAN'] },
    REJECT_PRODUCTION: { to: 'INTERNAL_TEST', allowedActors: ['HUMAN'] },
  },
  PUBLISHED: {
    BEGIN_MONITORING: { to: 'MONITORING', allowedActors: ['SYSTEM', 'AGENT'] },
  },
  MONITORING: {
    PROPOSE_ITERATION: { to: 'ITERATION_PROPOSED', allowedActors: ['AGENT'] },
    PAUSE: { to: 'PAUSED', allowedActors: ['HUMAN'] },
    KILL: { to: 'KILLED', allowedActors: ['HUMAN'] },
  },
  ITERATION_PROPOSED: {
    APPROVE_ITERATION: { to: 'APPROVED', allowedActors: ['HUMAN'] },
    DECLINE_ITERATION: { to: 'MONITORING', allowedActors: ['HUMAN'] },
  },
  PAUSED: {
    RESUME: { to: 'MONITORING', allowedActors: ['HUMAN'] },
    KILL: { to: 'KILLED', allowedActors: ['HUMAN'] },
  },
  REJECTED: {},
  KILLED: {},
};

class InvalidTransitionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * @param {string} fromState
 * @param {string} action
 * @param {string} actor - one of ACTORS
 * @returns {string} the resulting state
 * @throws {InvalidTransitionError} if the transition or actor is not allowed
 */
function validate(fromState, action, actor) {
  if (!STATES.includes(fromState)) {
    throw new InvalidTransitionError(`Unknown state: ${fromState}`);
  }
  if (!ACTORS.includes(actor)) {
    throw new InvalidTransitionError(`Unknown actor: ${actor}`);
  }
  const edges = TRANSITIONS[fromState] || {};
  const edge = edges[action];
  if (!edge) {
    throw new InvalidTransitionError(
      `Action '${action}' is not valid from state '${fromState}'. Valid actions: ${Object.keys(edges).join(', ') || '(none — terminal state)'}`,
    );
  }
  if (!edge.allowedActors.includes(actor)) {
    throw new InvalidTransitionError(
      `Actor '${actor}' may not perform '${action}' — only ${edge.allowedActors.join('/')} may.`,
    );
  }
  return edge.to;
}

function actionsFrom(state) {
  return Object.keys(TRANSITIONS[state] || {});
}

module.exports = { STATES, ACTORS, TRANSITIONS, InvalidTransitionError, validate, actionsFrom };
