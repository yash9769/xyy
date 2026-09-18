'use strict';

const express = require('express');
const path = require('path');
const store = require('./lib/store');
const stateMachine = require('./lib/stateMachine');
const auditLog = require('./lib/auditLog');

const app = express();
const PORT = process.env.PORT || 4177;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function handle(fn) {
  return (req, res) => {
    try {
      fn(req, res);
    } catch (e) {
      const status = e instanceof stateMachine.InvalidTransitionError ? 409 : 500;
      res.status(status).json({ error: e.message });
    }
  };
}

// -- Opportunities --
app.get('/api/opportunities', handle((req, res) => {
  res.json({ opportunities: store.listAllOpportunities(), counts: store.counts() });
}));

app.get('/api/opportunities/:id', handle((req, res) => {
  const opp = store.getOpportunity(req.params.id);
  if (!opp) return res.status(404).json({ error: 'Not found' });
  res.json({
    opportunity: opp,
    availableActions: stateMachine.actionsFrom(opp.lifecycle_state),
  });
}));

// Every mutation is an explicit, named action validated by the state machine — there is no
// generic "set status to X" endpoint, so the API itself cannot express an illegal transition.
app.post('/api/opportunities/:id/transition', handle((req, res) => {
  const { action, reason, note, actorName } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action is required' });
  // The dashboard UI only ever sends actor=HUMAN, since every button click here IS a human
  // decision — this is the enforcement point for "the agent must not approve its own work."
  const result = store.transition({ id: req.params.id, action, actor: 'HUMAN', reason, note, actorName });
  res.json(result);
}));

// -- Apps --
app.get('/api/apps', handle((req, res) => {
  res.json({ apps: store.listApps() });
}));

app.get('/api/apps/:id', handle((req, res) => {
  const appStatus = store.getAppStatus(req.params.id);
  if (!appStatus) return res.status(404).json({ error: 'Not found' });
  res.json({ app: appStatus });
}));

// -- Activity log --
app.get('/api/activity', handle((req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  res.json({ entries: auditLog.readAll().slice(0, limit) });
}));

// -- State machine reference (for the UI to render valid-actions without hardcoding them twice) --
app.get('/api/state-machine', handle((req, res) => {
  res.json({ states: stateMachine.STATES, transitions: stateMachine.TRANSITIONS });
}));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`App Factory Dashboard running at http://localhost:${PORT}`);
});
