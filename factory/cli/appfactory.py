#!/usr/bin/env python3
"""appfactory — CLI entrypoint for the App Factory pipeline.

See factory/ARCHITECTURE.md section 6 for the full command contract and
factory/ROADMAP.md for which commands are implemented vs. stubbed at this phase.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.orchestration import pipeline  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="appfactory", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_discover = sub.add_parser("discover", help="scaffold a new candidate opportunity")
    p_discover.add_argument("--problem", required=True, help="the underlying user problem, not a feature list")
    p_discover.add_argument("--category", required=True)
    p_discover.add_argument("--target-user", required=True, dest="target_user")

    p_analyze = sub.add_parser("analyze", help="research + score an opportunity (Phase 2)")
    p_analyze.add_argument("id")

    p_approve = sub.add_parser("approve", help="GATE 1 — approve a candidate opportunity")
    p_approve.add_argument("id")

    p_reject = sub.add_parser("reject", help="reject a candidate opportunity")
    p_reject.add_argument("id")
    p_reject.add_argument("--reason", required=True)

    for name, help_text in (
        ("spec", "generate PRD/user-stories/UX docs (Phase 1/2)"),
        ("build", "generate the app from template (Phase 3)"),
        ("test", "run the build/test/repair loop (Phase 4)"),
        ("review", "run security + policy review (Phase 4)"),
        ("release", "GATE 2/3 — build signed release candidate (Phase 5)"),
        ("publish", "GATE 4 — publish to a Play track (Phase 5)"),
        ("monitor", "pull post-launch metrics (Phase 6)"),
        ("iterate", "propose next version or recommend kill (Phase 6)"),
    ):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("id")

    p_status = sub.add_parser("status", help="show lifecycle state of one or all opportunities/apps")
    p_status.add_argument("id", nargs="?", default=None)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "discover":
        print(pipeline.cmd_discover(args.problem, args.category, args.target_user))
    elif args.command == "analyze":
        print(pipeline.cmd_analyze(args.id))
    elif args.command == "approve":
        print(pipeline.cmd_approve(args.id))
    elif args.command == "reject":
        print(pipeline.cmd_reject(args.id, args.reason))
    elif args.command == "status":
        print(pipeline.cmd_status(args.id))
    elif args.command in {"spec", "build", "test", "review", "release", "publish", "monitor", "iterate"}:
        print(pipeline.cmd_stub(args.command, args.id))
    else:
        parser.print_help()
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
