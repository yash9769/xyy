"""Pipeline commands backing the `appfactory` CLI.

As of the dashboard introduction, `discover`/`approve`/`reject`/`status` are thin wrappers around
`factory/dashboard/lib/cli.js` — the Node service layer is the single implementation of the state
machine and file I/O (see factory/dashboard/lib/stateMachine.js). This file must NOT reimplement
that logic; if you need a new state-mutating command, add it to cli.js first, then call it from
here. This keeps the CLI and the dashboard from ever disagreeing about what a legal transition is.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CLI_BRIDGE = REPO_ROOT / "factory" / "dashboard" / "lib" / "cli.js"

_STUB_PHASES = {
    "spec": "Phase 1/2",
    "build": "Phase 3",
    "test": "Phase 4",
    "review": "Phase 4",
    "release": "Phase 5",
    "publish": "Phase 5",
    "monitor": "Phase 6",
    "iterate": "Phase 6",
}


def _run_bridge(*args: str) -> dict:
    """Invoke the Node CLI bridge and parse its single-line JSON response. Raises RuntimeError
    with the bridge's own error message on failure (e.g. an invalid state transition) — never
    silently swallowed."""
    result = subprocess.run(
        ["node", str(CLI_BRIDGE), *args],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    output = result.stdout.strip() or result.stderr.strip()
    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        raise RuntimeError(f"Unexpected output from dashboard service layer: {output}")
    if "error" in data:
        raise RuntimeError(data["error"])
    return data


def cmd_discover(problem: str, category: str, target_user: str) -> str:
    try:
        data = _run_bridge(
            "discover",
            "--problem", problem,
            "--category", category,
            "--target-user", target_user,
        )
    except RuntimeError as e:
        return f"Error: {e}"
    return (
        f"Created candidate '{data['id']}' at {data['dir']}/opportunity.json "
        f"(lifecycle_state={data['lifecycle_state']})\n"
        f"Next: fill in evidence/existing_products/complaints, then review it in the dashboard "
        f"(`npm run dashboard`) or run `appfactory approve {data['id']}`."
    )


def cmd_analyze(opp_id: str) -> str:
    return (
        f"[stub] `analyze {opp_id}` is a Phase 2 capability (factory/ROADMAP.md).\n"
        f"For now: manually research competitors into candidates/{opp_id}/research/, "
        f"score by hand against factory/config/scoring-weights.yaml, and write "
        f"reports/{opp_id}/opportunity-report.md before approving it."
    )


def cmd_approve(opp_id: str) -> str:
    """GATE 1 — human approval. Equivalent to clicking Approve in the dashboard."""
    try:
        data = _run_bridge("transition", opp_id, "APPROVE_OPPORTUNITY", "--actor", "HUMAN")
    except RuntimeError as e:
        return f"Error: {e}"
    return f"GATE 1 passed: '{opp_id}' is now {data['opportunity']['lifecycle_state']}."


def cmd_reject(opp_id: str, reason: str) -> str:
    try:
        data = _run_bridge(
            "transition", opp_id, "REJECT_OPPORTUNITY",
            "--actor", "HUMAN", "--note", reason,
        )
    except RuntimeError as e:
        return f"Error: {e}"
    return f"'{opp_id}' rejected (state={data['opportunity']['lifecycle_state']})."


def cmd_stub(command: str, opp_id: str) -> str:
    phase = _STUB_PHASES.get(command, "a future phase")
    return (
        f"[stub] `{command} {opp_id}` is not implemented yet — it belongs to {phase} "
        f"of factory/ROADMAP.md. See factory/ARCHITECTURE.md section 6 for its intended contract."
    )


def cmd_status(opp_id: str | None = None) -> str:
    try:
        data = _run_bridge("status", *([opp_id] if opp_id else []))
    except RuntimeError as e:
        return f"Error: {e}"

    if opp_id:
        return json.dumps(data, indent=2)

    lines: list[str] = []
    for opp in data.get("opportunities", []):
        lines.append(f"{opp['id']:40s} opportunity  state={opp.get('lifecycle_state', 'UNKNOWN')}")
    for app in data.get("apps", []):
        lines.append(f"{app.get('appId', '?'):40s} app          state={app.get('lifecycle_state', 'UNKNOWN')}")

    if not lines:
        return "No opportunities or apps found yet. Run `appfactory discover` to create the first one."
    return "\n".join(lines)


def cmd_dashboard() -> str:
    """Launch the dashboard server (blocking) — same as `npm run dashboard`."""
    subprocess.run(["npm", "run", "dashboard"], cwd=REPO_ROOT)
    return ""
