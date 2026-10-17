#!/usr/bin/env python3
"""Build roadmap/data.json from Linear (team SHA, four 'Stream:' projects).

Two ways to run it, neither of which puts a secret in the repo or the browser:

  1. From a connector export (what Grok Bot does):
       python3 scripts/build_roadmap_data.py --from-export linear-export.json
     where linear-export.json is {"projects": [get_project(includeMilestones) ...],
     "issues": [list_issues(team=SHA) ...]} as returned by the Linear MCP connector.

  2. Straight from the Linear GraphQL API (used by .github/workflows/refresh-roadmap.yml):
       LINEAR_API_KEY=lin_api_... python3 scripts/build_roadmap_data.py --fetch
     The key is read from the environment only (a GitHub Actions secret in CI).

Bucketing rule (by key-result / milestone target date):
  Now   = target date <= 2026-11-08 (Phase 1)
  Next  = target date <= 2026-12-06 (Phase 2)
  Later = target date <= 2026-12-31 (Phase 3)
"""
import argparse, json, os, re, sys, urllib.request
from datetime import datetime, timezone

TEAM_KEY = "SHA"
STREAMS = ["Stream: Cashflow", "Stream: System", "Stream: Authority", "Stream: Team"]
PHASES = [
    {"key": "now", "label": "Now", "phase": "Phase 1", "start": "2026-10-19", "end": "2026-11-08"},
    {"key": "next", "label": "Next", "phase": "Phase 2", "start": "2026-11-09", "end": "2026-12-06"},
    {"key": "later", "label": "Later", "phase": "Phase 3", "start": "2026-12-07", "end": "2026-12-31"},
]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "roadmap", "data.json")


def bucket(target):
    if not target:
        return None
    for p in PHASES:
        if target <= p["end"]:
            return p["key"]
    return "beyond"


def objective(desc, summary):
    m = re.search(r"##\s*Objective\s*\n+(.+?)(?:\n\n|\n#|$)", desc or "", re.S)
    return (m.group(1).strip() if m else (summary or "")).strip()


def pct(v):
    if v is None:
        return 0
    if isinstance(v, str):
        return round(float(v.strip("% ") or 0))
    return round(v * 100) if v <= 1 else round(v)


def clean_issue(i):
    return {"id": i["id"], "title": i["title"], "url": i["url"],
            "status": i.get("status"), "statusType": i.get("statusType")}


def build(projects, issues):
    by_name = {p["name"]: p for p in projects}
    streams, missing = [], []
    for name in STREAMS:
        p = by_name.get(name)
        if not p:
            missing.append(name)
            continue
        its = [i for i in issues if i.get("project") == name]
        krs = []
        for m in p.get("milestones", []):
            mi = [clean_issue(i) for i in its if (i.get("projectMilestone") or {}).get("id") == m["id"]]
            mi.sort(key=lambda x: int(x["id"].split("-")[1]))
            desc = m.get("description") or ""
            krs.append({"id": m["id"], "name": m["name"], "description": desc,
                        "targetDate": m.get("targetDate"), "bucket": bucket(m.get("targetDate")),
                        "startsPhase1": bool(re.search(r"start in phase 1", desc, re.I)),
                        "progress": pct(m.get("progress")), "issues": mi})
        krs.sort(key=lambda k: (k["name"].split(":")[0]))
        loose = [clean_issue(i) for i in its if not i.get("projectMilestone")]
        streams.append({"id": p["id"], "name": name, "short": name.split(":", 1)[1].strip(),
                        "url": p["url"], "color": p.get("color"), "objective": objective(p.get("description"), p.get("summary")),
                        "startDate": p.get("startDate"), "targetDate": p.get("targetDate"),
                        "keyResults": krs, "unassigned": loose})
    if missing:
        print("WARNING: projects not found:", missing, file=sys.stderr)
    return {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": f"Linear team {TEAM_KEY}", "phases": PHASES, "streams": streams}


GQL = """query($names:[String!]){ projects(first:20, filter:{name:{in:$names}}){ nodes {
 id name url color summary description startDate targetDate
 teams { nodes { key } }
 projectMilestones { nodes { id name description targetDate progress } }
 issues(first:250) { nodes { identifier title url team { key } state { name type } projectMilestone { id name } } }
}}}"""


def fetch():
    key = os.environ.get("LINEAR_API_KEY")
    if not key:
        sys.exit("LINEAR_API_KEY not set")
    req = urllib.request.Request("https://api.linear.app/graphql", method="POST",
                                 data=json.dumps({"query": GQL, "variables": {"names": STREAMS}}).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": key})
    data = json.load(urllib.request.urlopen(req, timeout=60))
    if data.get("errors"):
        sys.exit(f"Linear API error: {data['errors']}")
    projects, issues = [], []
    for n in data["data"]["projects"]["nodes"]:
        if TEAM_KEY not in [t["key"] for t in n["teams"]["nodes"]]:
            continue
        projects.append({**n, "milestones": n["projectMilestones"]["nodes"]})
        for i in n["issues"]["nodes"]:
            if i["team"]["key"] != TEAM_KEY:
                continue
            issues.append({"id": i["identifier"], "title": i["title"], "url": i["url"], "project": n["name"],
                           "status": i["state"]["name"], "statusType": i["state"]["type"],
                           "projectMilestone": i["projectMilestone"]})
    return projects, issues


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--from-export")
    g.add_argument("--fetch", action="store_true")
    ap.add_argument("--out", default=OUT)
    a = ap.parse_args()
    if a.fetch:
        projects, issues = fetch()
    else:
        raw = json.load(open(a.from_export))
        projects, issues = raw["projects"], raw["issues"]
    out = build(projects, issues)
    with open(a.out, "w") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")
    n_kr = sum(len(s["keyResults"]) for s in out["streams"])
    n_is = sum(len(k["issues"]) for s in out["streams"] for k in s["keyResults"]) + sum(len(s["unassigned"]) for s in out["streams"])
    print(f"wrote {a.out}: {len(out['streams'])} streams, {n_kr} key results, {n_is} issues")
