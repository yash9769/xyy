# scoring

Deterministic opportunity scoring engine. Reads `factory/config/scoring-weights.yaml` + an opportunity/research bundle, writes a score block back into the opportunity record and a human-readable `reports/<id>/opportunity-report.md` with evidence and recommended action (BUILD/RESEARCH_MORE/WATCH/REJECT).
