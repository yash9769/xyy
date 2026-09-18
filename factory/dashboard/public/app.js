'use strict';

const content = document.getElementById('content');

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function badgeClassFor(state) {
  if (!state) return 'badge-default';
  if (state.startsWith('AWAITING_')) return 'badge-awaiting';
  if (state === 'APPROVED') return 'badge-approved';
  if (['BUILDING', 'TESTING', 'SECURITY_REVIEW', 'SPEC_GENERATING', 'RESEARCHING'].includes(state)) return 'badge-building';
  if (['PUBLISHED', 'MONITORING', 'RELEASE_CANDIDATE', 'INTERNAL_TEST'].includes(state)) return 'badge-done';
  if (state === 'REJECTED' || state === 'KILLED') return 'badge-rejected';
  return 'badge-default';
}

function badge(state) {
  return `<span class="badge ${badgeClassFor(state)}">${escapeHtml(state || 'UNKNOWN')}</span>`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---- Routing ----
const routes = {
  '/': renderDashboard,
  '/opportunities': renderOpportunitiesList,
  '/approved': renderApprovedList,
  '/building': renderBuilding,
  '/testing': () => renderStub('Testing', 'Automated build/test/repair-loop status will appear here once Phase 4 (automated QA) is implemented. See factory/ROADMAP.md.'),
  '/release-candidates': renderReleaseCandidates,
  '/published': () => renderStub('Published', 'No app has been published yet. Production publishing always requires explicit human confirmation (Gate 4) and is not automated.'),
  '/analytics': () => renderStub('Analytics', 'Post-launch monitoring will appear here once an app is published and Phase 6 (monitoring pipeline) is implemented.'),
  '/activity': renderActivity,
  '/agent': renderAgentActivity,
  '/settings': renderSettings,
};

async function router() {
  const hash = location.hash.replace(/^#/, '') || '/';
  document.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('active', hash === a.dataset.route || (a.dataset.route !== '/' && hash.startsWith(a.dataset.route)));
  });

  if (hash.startsWith('/opportunities/')) {
    return renderOpportunityDetail(hash.split('/')[2]);
  }
  const handler = routes[hash] || routes['/'];
  try {
    await handler();
  } catch (e) {
    content.innerHTML = `<div class="card">Error loading view: ${escapeHtml(e.message)}</div>`;
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// ---- Dashboard ----
async function renderDashboard() {
  const { opportunities, counts } = await api('/api/opportunities');
  const awaiting = opportunities.filter((o) => (o.lifecycle_state || '').startsWith('AWAITING_'));

  content.innerHTML = `
    <h1>Dashboard</h1>
    <div class="subtitle">App Factory Command Center — Claude operates the factory, you operate this panel.</div>

    ${awaiting.length > 0 ? `
      <div class="action-required">
        <div class="title">Action required</div>
        <div>${awaiting.length} item${awaiting.length === 1 ? '' : 's'} waiting for your decision.</div>
        <ul>
          ${awaiting.slice(0, 5).map((o) => `<li><a href="#/opportunities/${o.id}" style="color:inherit">${escapeHtml(o.id)}</a> — ${badge(o.lifecycle_state)}</li>`).join('')}
        </ul>
        <div style="margin-top:12px"><a class="btn btn-more" href="#/opportunities">Review Opportunities</a></div>
      </div>
    ` : `
      <div class="action-required" style="border-color: var(--green)">
        <div class="title" style="color:var(--green)">Action required</div>
        <div class="none">Nothing is waiting on you right now.</div>
      </div>
    `}

    <div class="stat-grid">
      <div class="stat-card"><div class="value">${counts.total}</div><div class="label">Total Opportunities</div></div>
      <div class="stat-card"><div class="value">${counts.awaitingApproval}</div><div class="label">Awaiting Approval</div></div>
      <div class="stat-card"><div class="value">${counts.approved}</div><div class="label">Approved</div></div>
      <div class="stat-card"><div class="value">${counts.building}</div><div class="label">Building</div></div>
      <div class="stat-card"><div class="value">${counts.testing}</div><div class="label">Testing</div></div>
      <div class="stat-card"><div class="value">${counts.releaseCandidate}</div><div class="label">Ready for Release</div></div>
      <div class="stat-card"><div class="value">${counts.published}</div><div class="label">Published</div></div>
      <div class="stat-card"><div class="value">${counts.pausedOrKilled}</div><div class="label">Paused/Killed</div></div>
    </div>
  `;
}

// ---- Opportunities list ----
function opportunityRow(o) {
  return `
    <tr class="clickable" onclick="location.hash='#/opportunities/${o.id}'">
      <td>${escapeHtml(o.id)}</td>
      <td>${escapeHtml(o.category || '')}</td>
      <td>${badge(o.lifecycle_state)}</td>
      <td>${escapeHtml(o.market_signal || '')}</td>
      <td>${timeAgo(o.updated_at)}</td>
    </tr>
  `;
}

async function renderOpportunitiesList() {
  const { opportunities } = await api('/api/opportunities');
  const active = opportunities.filter((o) => o.lifecycle_state !== 'REJECTED');
  content.innerHTML = `
    <h1>Opportunities</h1>
    <div class="subtitle">Every opportunity Claude has discovered or researched. Click one to review the evidence.</div>
    <div class="card">
      <table>
        <thead><tr><th>ID</th><th>Category</th><th>State</th><th>Market signal</th><th>Updated</th></tr></thead>
        <tbody>${active.length ? active.map(opportunityRow).join('') : '<tr><td colspan="5" class="stub-note">No opportunities yet. Run `appfactory discover` to create one.</td></tr>'}</tbody>
      </table>
    </div>
    <h2>Rejected</h2>
    <div class="card">
      <table>
        <thead><tr><th>ID</th><th>Category</th><th>Reason</th><th>Updated</th></tr></thead>
        <tbody>${
          opportunities.filter((o) => o.lifecycle_state === 'REJECTED').map((o) => `
            <tr class="clickable" onclick="location.hash='#/opportunities/${o.id}'">
              <td>${escapeHtml(o.id)}</td><td>${escapeHtml(o.category || '')}</td>
              <td>${escapeHtml(o.rejection_reason || '')}</td><td>${timeAgo(o.updated_at)}</td>
            </tr>`).join('') || '<tr><td colspan="4" class="stub-note">None rejected yet.</td></tr>'
        }</tbody>
      </table>
    </div>
  `;
}

async function renderApprovedList() {
  const { opportunities } = await api('/api/opportunities');
  const approved = opportunities.filter((o) => !['DISCOVERED', 'RESEARCHING', 'RESEARCH_COMPLETE', 'AWAITING_OPPORTUNITY_APPROVAL', 'REJECTED'].includes(o.lifecycle_state));
  content.innerHTML = `
    <h1>Approved</h1>
    <div class="subtitle">Opportunities that passed Gate 1 and are somewhere in the build/release pipeline.</div>
    <div class="card">
      <table>
        <thead><tr><th>ID</th><th>State</th><th>Updated</th></tr></thead>
        <tbody>${approved.length ? approved.map((o) => `
          <tr class="clickable" onclick="location.hash='#/opportunities/${o.id}'">
            <td>${escapeHtml(o.id)}</td><td>${badge(o.lifecycle_state)}</td><td>${timeAgo(o.updated_at)}</td>
          </tr>`).join('') : '<tr><td colspan="3" class="stub-note">Nothing approved yet.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

async function renderReleaseCandidates() {
  const { opportunities } = await api('/api/opportunities');
  const rcs = opportunities.filter((o) => ['RELEASE_CANDIDATE', 'AWAITING_RELEASE_APPROVAL', 'INTERNAL_TEST'].includes(o.lifecycle_state));
  content.innerHTML = `
    <h1>Release Candidates</h1>
    <div class="subtitle">Apps that have gone through build/test/security review.</div>
    <div class="card">
      <table>
        <thead><tr><th>ID</th><th>State</th><th>Updated</th></tr></thead>
        <tbody>${rcs.length ? rcs.map((o) => `
          <tr class="clickable" onclick="location.hash='#/opportunities/${o.id}'">
            <td>${escapeHtml(o.id)}</td><td>${badge(o.lifecycle_state)}</td><td>${timeAgo(o.updated_at)}</td>
          </tr>`).join('') : '<tr><td colspan="3" class="stub-note">None yet.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

// ---- Opportunity detail ----
function evidenceList(evidence) {
  if (!evidence || !evidence.length) return '<div class="stub-note">No evidence recorded.</div>';
  return evidence.map((e) => `
    <div class="evidence-item">
      <span class="evidence-type">${escapeHtml(e.type)}</span>${escapeHtml(e.claim)}
      ${e.source_url ? `<br/><a href="${escapeHtml(e.source_url)}" target="_blank" style="color:var(--accent);font-size:12px">${escapeHtml(e.source_url)}</a>` : ''}
    </div>
  `).join('');
}

function listOrNone(items, emptyText) {
  if (!items || !items.length) return `<div class="stub-note">${emptyText}</div>`;
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

const ACTION_LABELS = {
  APPROVE_OPPORTUNITY: { label: 'Approve', cls: 'btn-approve' },
  REJECT_OPPORTUNITY: { label: 'Reject', cls: 'btn-reject' },
  NEED_MORE_RESEARCH: { label: 'Need More Research', cls: 'btn-more' },
  APPROVE_SPEC: { label: 'Approve Spec', cls: 'btn-approve' },
  REJECT_SPEC: { label: 'Reject Spec', cls: 'btn-reject' },
  APPROVE_RELEASE: { label: 'Approve Release', cls: 'btn-approve' },
  REJECT_RELEASE: { label: 'Reject Release (back to Building)', cls: 'btn-reject' },
  APPROVE_PRODUCTION: { label: 'Approve for Production', cls: 'btn-approve' },
  REJECT_PRODUCTION: { label: 'Reject Production', cls: 'btn-reject' },
  PAUSE: { label: 'Pause', cls: 'btn-more' },
  KILL: { label: 'Kill', cls: 'btn-reject' },
  RESUME: { label: 'Resume', cls: 'btn-approve' },
  APPROVE_ITERATION: { label: 'Approve Iteration', cls: 'btn-approve' },
  DECLINE_ITERATION: { label: 'Decline Iteration', cls: 'btn-reject' },
};

const REJECTION_REASONS = ['weak_demand', 'too_competitive', 'poor_monetization', 'too_difficult', 'policy_risk', 'ip_risk', 'not_interesting', 'other'];

async function renderOpportunityDetail(id) {
  const { opportunity: o, availableActions } = await api(`/api/opportunities/${encodeURIComponent(id)}`);

  content.innerHTML = `
    <a class="back-link" href="#/opportunities">&larr; Back to Opportunities</a>
    <h1>${escapeHtml(o.id)}</h1>
    <div class="subtitle">${badge(o.lifecycle_state)} &nbsp; Category: ${escapeHtml(o.category)} &nbsp; Researched: ${escapeHtml((o.created_at || '').slice(0, 10))}</div>

    <div class="card">
      <div class="section-label">Target user</div>
      <div>${escapeHtml(o.target_user)}</div>
      <div class="section-label">Problem</div>
      <div>${escapeHtml(o.problem)}</div>
      <div class="section-label">Proposed solution</div>
      <div>${escapeHtml(o.proposed_solution)}</div>
    </div>

    <div class="card">
      <div class="section-label">Existing competitors</div>
      ${listOrNone(o.existing_products, 'None recorded.')}
      <div class="section-label">Complaints (evidence-labeled)</div>
      ${listOrNone(o.complaints, 'None recorded.')}
      <div class="section-label">Requested features (evidence-labeled)</div>
      ${listOrNone(o.requested_features, 'None recorded.')}
      <div class="section-label">Our proposed differentiation</div>
      ${listOrNone(o.differentiation, 'None recorded — this should never be empty for an approved opportunity.')}
    </div>

    <div class="card">
      <div class="section-label">Evidence (why Claude thinks this is an opportunity)</div>
      ${evidenceList(o.evidence)}
    </div>

    <div class="card">
      <table>
        <tbody>
          <tr><th>Monetization</th><td>${escapeHtml(o.monetization)}</td></tr>
          <tr><th>Estimated build days</th><td>${escapeHtml(o.estimated_build_days)}</td></tr>
          <tr><th>Backend required</th><td>${o.backend_required ? 'Yes' : 'No'}</td></tr>
          <tr><th>IP risk</th><td>${escapeHtml(o.ip_risk)}</td></tr>
          <tr><th>Policy risk</th><td>${escapeHtml(o.policy_risk)}</td></tr>
          <tr><th>Technical risk</th><td>${escapeHtml(o.technical_risk)}</td></tr>
          <tr><th>Market signal</th><td>${escapeHtml(o.market_signal)}</td></tr>
          ${o.rejection_reason ? `<tr><th>Rejection reason</th><td>${escapeHtml(o.rejection_reason)}${o.rejection_note ? ' — ' + escapeHtml(o.rejection_note) : ''}</td></tr>` : ''}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="section-label">Decide</div>
      ${availableActions.length ? availableActions.map((a) => {
        const meta = ACTION_LABELS[a] || { label: a, cls: 'btn' };
        return `<button class="btn ${meta.cls}" onclick="handleAction('${escapeHtml(o.id)}', '${a}')">${escapeHtml(meta.label)}</button>`;
      }).join('') : '<div class="stub-note">No actions available from this state (it may be a terminal or agent-only state).</div>'}
    </div>
  `;
}

async function handleAction(id, action) {
  if (action === 'REJECT_OPPORTUNITY' || action === 'REJECT_SPEC' || action === 'REJECT_RELEASE' || action === 'REJECT_PRODUCTION' || action === 'KILL') {
    return showRejectModal(id, action);
  }
  if (!confirm(`Confirm: ${ACTION_LABELS[action]?.label || action} for "${id}"? This is recorded as your decision in the audit log.`)) return;
  try {
    await api(`/api/opportunities/${encodeURIComponent(id)}/transition`, { method: 'POST', body: JSON.stringify({ action }) });
    router();
  } catch (e) {
    alert('Action failed: ' + e.message);
  }
}

function showRejectModal(id, action) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Reject — reason required</h3>
      <select id="reject-reason">${REJECTION_REASONS.map((r) => `<option value="${r}">${r.replace(/_/g, ' ')}</option>`).join('')}</select>
      <textarea id="reject-note" placeholder="Optional detail..." rows="3"></textarea>
      <button class="btn btn-reject" id="reject-confirm">Confirm Reject</button>
      <button class="btn" id="reject-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(backdrop);
  document.getElementById('reject-cancel').onclick = () => backdrop.remove();
  document.getElementById('reject-confirm').onclick = async () => {
    const reason = document.getElementById('reject-reason').value;
    const note = document.getElementById('reject-note').value;
    try {
      await api(`/api/opportunities/${encodeURIComponent(id)}/transition`, { method: 'POST', body: JSON.stringify({ action, reason, note }) });
      backdrop.remove();
      router();
    } catch (e) {
      alert('Action failed: ' + e.message);
    }
  };
}
window.handleAction = handleAction;

// ---- Building (app status) ----
const STAGE_ICON = { done: '✓', partial: '◐', not_run: '○', blocked: '✗', waiting: '○' };
const STAGE_CLASS = { done: 'status-icon-done', partial: 'status-icon-partial', not_run: 'status-icon-waiting', blocked: 'status-icon-blocked', waiting: 'status-icon-waiting' };

async function renderBuilding() {
  const { apps } = await api('/api/apps');
  if (!apps.length) {
    return renderStub('Building', 'No apps have entered the build pipeline yet.');
  }
  content.innerHTML = `
    <h1>Building</h1>
    <div class="subtitle">Every app currently in or past implementation, with its real (not simulated) status.</div>
    ${apps.map((a) => `
      <div class="card">
        <h2 style="margin-top:0">${escapeHtml(a.appName || a.appId)} <span style="float:right">${badge(a.lifecycle_state)}</span></h2>
        ${a.stages ? Object.entries(a.stages).map(([stage, status]) => `
          <div class="progress-row">
            <span class="stage-name">${escapeHtml(stage.replace(/_/g, ' ').toUpperCase())}</span>
            <span class="${STAGE_CLASS[status] || ''}">${STAGE_ICON[status] || '?'}</span>
            <span style="color:var(--text-dim)">${escapeHtml(status)}</span>
          </div>
        `).join('') : ''}
        <div class="section-label">Build status</div>
        <div>${escapeHtml(a.build_status || 'unknown')}</div>
        <div class="section-label">Test status</div>
        <div>${escapeHtml(a.test_status || 'unknown')}</div>
        <div class="section-label">Security status</div>
        <div>${escapeHtml(a.security_status || 'unknown')}</div>
        ${a.blockers && a.blockers.length ? `
          <div class="section-label">Blockers</div>
          ${a.blockers.map((b) => `<div class="blocker-row"><span class="blocker-sev ${b.severity}">${b.severity}</span>${escapeHtml(b.description)} <span style="color:var(--text-dim)">(${escapeHtml(b.reference)})</span></div>`).join('')}
        ` : ''}
        ${a.note ? `<div class="stub-note" style="text-align:left;padding:12px 0 0">${escapeHtml(a.note)}</div>` : ''}
      </div>
    `).join('')}
  `;
}

// ---- Activity log ----
async function renderActivity() {
  const { entries } = await api('/api/activity');
  content.innerHTML = `
    <h1>Activity Log</h1>
    <div class="subtitle">Every recorded state transition — an append-only, permanent record.</div>
    <div class="card">
      ${entries.length ? entries.map((e) => `
        <div class="activity-item">
          <div class="activity-time">${escapeHtml(new Date(e.timestamp).toLocaleString())}</div>
          <div>
            <span class="activity-actor ${escapeHtml(e.actor)}">${escapeHtml(e.actorName || e.actor)}</span>
            performed <strong>${escapeHtml(e.action)}</strong>
            ${e.opportunityId ? `on <a href="#/opportunities/${escapeHtml(e.opportunityId)}" style="color:var(--accent)">${escapeHtml(e.opportunityId)}</a>` : ''}
            ${e.previousState ? `<br/><span style="color:var(--text-dim)">${escapeHtml(e.previousState)} &rarr; ${escapeHtml(e.newState)}</span>` : ''}
            ${e.reason ? `<br/><span style="color:var(--text-dim)">reason: ${escapeHtml(e.reason)}${e.note ? ' — ' + escapeHtml(e.note) : ''}</span>` : ''}
          </div>
        </div>
      `).join('') : '<div class="stub-note">No activity recorded yet.</div>'}
    </div>
  `;
}

// ---- Agent activity (operational status only, no hidden reasoning) ----
async function renderAgentActivity() {
  content.innerHTML = `
    <h1>Agent Activity</h1>
    <div class="subtitle">Operational status only — not Claude's internal reasoning.</div>
    <div class="card">
      <div class="section-label">Current task</div>
      <div>Idle — no long-running automated agent process exists yet in this phase. Discovery, research, and build steps are run interactively by the owner invoking Claude Code, not by a background daemon this dashboard supervises.</div>
      <div class="section-label">Agent control</div>
      <div class="stub-note" style="text-align:left;padding:8px 0">Start/Pause/Stop controls apply to a live, long-running automated agent loop — that doesn't exist until Phase 2+ (automated discovery/build loops) is implemented. This page will gain real controls then, not before.</div>
    </div>
  `;
}

function renderSettings() {
  content.innerHTML = `
    <h1>Settings</h1>
    <div class="card">
      <div class="section-label">Data source</div>
      <div>This dashboard reads/writes the same files the <code>appfactory</code> CLI uses: <code>candidates/</code>, <code>approved/</code>, <code>rejected/</code>, <code>apps/</code>, and <code>factory/state/audit-log.jsonl</code>. There is no separate database — the dashboard is a view over the same state, never a second source of truth.</div>
      <div class="section-label">State machine reference</div>
      <div><a href="/api/state-machine" target="_blank" style="color:var(--accent)">View raw state machine definition (JSON)</a></div>
    </div>
  `;
}

function renderStub(title, message) {
  content.innerHTML = `<h1>${escapeHtml(title)}</h1><div class="card stub-note">${escapeHtml(message)}</div>`;
}
