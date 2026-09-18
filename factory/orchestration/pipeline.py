"""Pipeline state machine backing the `appfactory` CLI.

Phase 1 (see factory/ROADMAP.md) implements `discover`, `approve`, and `status` for
real, file-based operation. Every other command is a clearly-labeled stub that
names the roadmap phase where it becomes real, rather than pretending to work.
"""
from __future__ import annotations

import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CANDIDATES_DIR = REPO_ROOT / "candidates"
APPROVED_DIR = REPO_ROOT / "approved"
REJECTED_DIR = REPO_ROOT / "rejected"
APPS_DIR = REPO_ROOT / "apps"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "unnamed-opportunity"


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=False) + "\n")


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def cmd_discover(problem: str, category: str, target_user: str) -> str:
    """Scaffold a new candidate opportunity record. Real research/scoring is manual
    until Phase 2 automates it (factory/ROADMAP.md)."""
    opp_id = _slugify(problem if len(problem) < 60 else category)
    opp_dir = CANDIDATES_DIR / opp_id
    if opp_dir.exists():
        return f"Candidate '{opp_id}' already exists at {opp_dir.relative_to(REPO_ROOT)}"

    record = {
        "id": opp_id,
        "category": category,
        "problem": problem,
        "target_user": target_user,
        "existing_products": [],
        "evidence": [],
        "complaints": [],
        "requested_features": [],
        "proposed_solution": "",
        "differentiation": [],
        "monetization": "unknown",
        "estimated_build_days": 0,
        "backend_required": False,
        "ip_risk": "low",
        "policy_risk": "low",
        "technical_risk": "low",
        "market_signal": "weak",
        "status": "candidate",
        "created_at": _now(),
        "updated_at": _now(),
    }
    _write_json(opp_dir / "opportunity.json", record)
    (opp_dir / "research").mkdir(exist_ok=True)
    return (
        f"Created candidate '{opp_id}' at {opp_dir.relative_to(REPO_ROOT)}/opportunity.json\n"
        f"Next: fill in evidence/existing_products/complaints, then run `appfactory analyze {opp_id}`."
    )


def cmd_analyze(opp_id: str) -> str:
    return (
        f"[stub] `analyze {opp_id}` is a Phase 2 capability (factory/ROADMAP.md).\n"
        f"For now: manually research competitors into candidates/{opp_id}/research/, "
        f"score by hand against factory/config/scoring-weights.yaml, and write "
        f"reports/{opp_id}/opportunity-report.md before running `appfactory approve {opp_id}`."
    )


def cmd_approve(opp_id: str) -> str:
    """GATE 1 — human approval. Moves candidates/<id> -> approved/<id>."""
    src = CANDIDATES_DIR / opp_id
    if not src.exists():
        return f"No such candidate: {opp_id} (looked in {src.relative_to(REPO_ROOT)})"
    dest = APPROVED_DIR / opp_id
    if dest.exists():
        return f"'{opp_id}' is already approved at {dest.relative_to(REPO_ROOT)}"

    opp_path = src / "opportunity.json"
    record = _read_json(opp_path)
    record["status"] = "approved"
    record["updated_at"] = _now()
    _write_json(opp_path, record)

    shutil.move(str(src), str(dest))
    return (
        f"GATE 1 passed: '{opp_id}' moved to {dest.relative_to(REPO_ROOT)}.\n"
        f"Next: `appfactory spec {opp_id}` (Phase 1/2) to generate PRD/UX docs."
    )


def cmd_reject(opp_id: str, reason: str) -> str:
    src = CANDIDATES_DIR / opp_id
    if not src.exists():
        return f"No such candidate: {opp_id}"
    dest = REJECTED_DIR / opp_id
    opp_path = src / "opportunity.json"
    record = _read_json(opp_path)
    record["status"] = "rejected"
    record["updated_at"] = _now()
    record.setdefault("score", {})["reasoning"] = reason
    _write_json(opp_path, record)
    shutil.move(str(src), str(dest))
    return f"'{opp_id}' rejected and moved to {dest.relative_to(REPO_ROOT)}."


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


def cmd_stub(command: str, opp_id: str) -> str:
    phase = _STUB_PHASES.get(command, "a future phase")
    return (
        f"[stub] `{command} {opp_id}` is not implemented yet — it belongs to {phase} "
        f"of factory/ROADMAP.md. See factory/ARCHITECTURE.md section 6 for its intended contract."
    )


def cmd_status(opp_id: str | None = None) -> str:
    lines: list[str] = []
    for label, directory in (
        ("candidate", CANDIDATES_DIR),
        ("approved", APPROVED_DIR),
        ("rejected", REJECTED_DIR),
    ):
        if not directory.exists():
            continue
        for entry in sorted(directory.iterdir()):
            if not entry.is_dir():
                continue
            if opp_id and entry.name != opp_id:
                continue
            opp_file = entry / "opportunity.json"
            status = "unknown"
            if opp_file.exists():
                status = _read_json(opp_file).get("status", "unknown")
            lines.append(f"{entry.name:35s} {label:10s} status={status}")

    if APPS_DIR.exists():
        for entry in sorted(APPS_DIR.iterdir()):
            if not entry.is_dir():
                continue
            if opp_id and entry.name != opp_id:
                continue
            manifest_file = entry / "app-manifest.json"
            lifecycle = "unknown"
            if manifest_file.exists():
                lifecycle = _read_json(manifest_file).get("lifecycle_status", "unknown")
            lines.append(f"{entry.name:35s} {'app':10s} lifecycle={lifecycle}")

    if not lines:
        return "No opportunities or apps found yet. Run `appfactory discover` to create the first one."
    return "\n".join(lines)
