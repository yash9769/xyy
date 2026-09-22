'use strict';

/**
 * Regression tests for the factory's single source of truth on legal lifecycle transitions.
 * Run with: node --test factory/dashboard/lib
 *
 * The HUMAN_ONLY_TRANSITIONS list below is hardcoded deliberately, not derived from
 * stateMachine.js's own TRANSITIONS table, for every actor-rejection assertion. If someone later
 * widens one of these edges to also allow AGENT or SYSTEM, the corresponding assert.throws() call
 * stops throwing and the test fails — it does not silently adapt to the new behavior.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const stateMachine = require('./stateMachine');

test('valid AGENT-only transitions succeed', () => {
  assert.equal(stateMachine.validate('RESEARCHING', 'COMPLETE_RESEARCH', 'AGENT'), 'RESEARCH_COMPLETE');
  assert.equal(stateMachine.validate('RESEARCH_COMPLETE', 'SUBMIT_FOR_APPROVAL', 'AGENT'), 'AWAITING_OPPORTUNITY_APPROVAL');
  assert.equal(stateMachine.validate('BUILDING', 'COMPLETE_BUILD', 'AGENT'), 'TESTING');
  assert.equal(stateMachine.validate('TESTING', 'COMPLETE_TESTING', 'AGENT'), 'SECURITY_REVIEW');
  assert.equal(stateMachine.validate('SECURITY_REVIEW', 'COMPLETE_SECURITY_REVIEW', 'AGENT'), 'RELEASE_CANDIDATE');
});

test('valid AGENT-or-HUMAN transitions succeed for both actors', () => {
  assert.equal(stateMachine.validate('DISCOVERED', 'START_RESEARCH', 'AGENT'), 'RESEARCHING');
  assert.equal(stateMachine.validate('DISCOVERED', 'START_RESEARCH', 'HUMAN'), 'RESEARCHING');
  assert.equal(stateMachine.validate('APPROVED', 'START_SPEC', 'AGENT'), 'SPEC_GENERATING');
  assert.equal(stateMachine.validate('APPROVED', 'START_SPEC', 'HUMAN'), 'SPEC_GENERATING');
});

test('valid HUMAN approval transitions succeed', () => {
  assert.equal(stateMachine.validate('AWAITING_OPPORTUNITY_APPROVAL', 'APPROVE_OPPORTUNITY', 'HUMAN'), 'APPROVED');
  assert.equal(stateMachine.validate('AWAITING_SPEC_APPROVAL', 'APPROVE_SPEC', 'HUMAN'), 'BUILDING');
  assert.equal(stateMachine.validate('AWAITING_RELEASE_APPROVAL', 'APPROVE_RELEASE', 'HUMAN'), 'INTERNAL_TEST');
  assert.equal(stateMachine.validate('AWAITING_PRODUCTION_APPROVAL', 'APPROVE_PRODUCTION', 'HUMAN'), 'PUBLISHED');
});

test('valid SYSTEM/AGENT transitions succeed where currently defined', () => {
  assert.equal(stateMachine.validate('PUBLISHED', 'BEGIN_MONITORING', 'SYSTEM'), 'MONITORING');
  assert.equal(stateMachine.validate('PUBLISHED', 'BEGIN_MONITORING', 'AGENT'), 'MONITORING');
});

test('unknown state is rejected', () => {
  assert.throws(
    () => stateMachine.validate('NOT_A_REAL_STATE', 'START_RESEARCH', 'AGENT'),
    stateMachine.InvalidTransitionError,
  );
});

test('unknown action is rejected', () => {
  assert.throws(
    () => stateMachine.validate('DISCOVERED', 'NOT_A_REAL_ACTION', 'AGENT'),
    stateMachine.InvalidTransitionError,
  );
});

test('unknown actor is rejected', () => {
  assert.throws(
    () => stateMachine.validate('DISCOVERED', 'START_RESEARCH', 'ROBOT'),
    stateMachine.InvalidTransitionError,
  );
});

test('disallowed actor is rejected for an actor-restricted transition', () => {
  assert.throws(
    () => stateMachine.validate('RESEARCHING', 'COMPLETE_RESEARCH', 'HUMAN'),
    stateMachine.InvalidTransitionError,
  );
});

test('invalid state/action combination is rejected', () => {
  assert.throws(
    () => stateMachine.validate('DISCOVERED', 'APPROVE_OPPORTUNITY', 'HUMAN'),
    stateMachine.InvalidTransitionError,
  );
});

test('terminal states accept no further actions', () => {
  assert.deepEqual(stateMachine.actionsFrom('REJECTED'), []);
  assert.deepEqual(stateMachine.actionsFrom('KILLED'), []);
  assert.throws(
    () => stateMachine.validate('REJECTED', 'ANYTHING', 'HUMAN'),
    stateMachine.InvalidTransitionError,
  );
  assert.throws(
    () => stateMachine.validate('KILLED', 'ANYTHING', 'HUMAN'),
    stateMachine.InvalidTransitionError,
  );
});

// Every transition in the factory today that is gated to HUMAN only. Hardcoded on purpose — see
// the file header comment.
const HUMAN_ONLY_TRANSITIONS = [
  ['AWAITING_OPPORTUNITY_APPROVAL', 'APPROVE_OPPORTUNITY'],
  ['AWAITING_OPPORTUNITY_APPROVAL', 'REJECT_OPPORTUNITY'],
  ['AWAITING_OPPORTUNITY_APPROVAL', 'NEED_MORE_RESEARCH'],
  ['AWAITING_SPEC_APPROVAL', 'APPROVE_SPEC'],
  ['AWAITING_SPEC_APPROVAL', 'REJECT_SPEC'],
  ['AWAITING_RELEASE_APPROVAL', 'APPROVE_RELEASE'],
  ['AWAITING_RELEASE_APPROVAL', 'REJECT_RELEASE'],
  ['AWAITING_PRODUCTION_APPROVAL', 'APPROVE_PRODUCTION'],
  ['AWAITING_PRODUCTION_APPROVAL', 'REJECT_PRODUCTION'],
  ['MONITORING', 'PAUSE'],
  ['MONITORING', 'KILL'],
  ['ITERATION_PROPOSED', 'APPROVE_ITERATION'],
  ['ITERATION_PROPOSED', 'DECLINE_ITERATION'],
  ['PAUSED', 'RESUME'],
  ['PAUSED', 'KILL'],
];

test('every HUMAN-only transition rejects AGENT and SYSTEM, accepts HUMAN', () => {
  for (const [state, action] of HUMAN_ONLY_TRANSITIONS) {
    assert.throws(
      () => stateMachine.validate(state, action, 'AGENT'),
      stateMachine.InvalidTransitionError,
      `expected AGENT to be rejected for ${state} -> ${action}`,
    );
    assert.throws(
      () => stateMachine.validate(state, action, 'SYSTEM'),
      stateMachine.InvalidTransitionError,
      `expected SYSTEM to be rejected for ${state} -> ${action}`,
    );
    assert.doesNotThrow(
      () => stateMachine.validate(state, action, 'HUMAN'),
      `expected HUMAN to be accepted for ${state} -> ${action}`,
    );
  }
});

test('HUMAN_ONLY_TRANSITIONS covers every currently-defined HUMAN-only edge (no silent gaps)', () => {
  const actual = [];
  for (const [state, edges] of Object.entries(stateMachine.TRANSITIONS)) {
    for (const [action, edge] of Object.entries(edges)) {
      if (edge.allowedActors.length === 1 && edge.allowedActors[0] === 'HUMAN') {
        actual.push(`${state}:${action}`);
      }
    }
  }
  const expected = HUMAN_ONLY_TRANSITIONS.map(([s, a]) => `${s}:${a}`);
  assert.deepEqual(actual.sort(), expected.sort());
});
