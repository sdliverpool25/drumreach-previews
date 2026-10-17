# Refreshing the 2026 Roadmap data

The roadmap page (`roadmap/`) is fully static. It reads `roadmap/data.json`, a snapshot of
Linear team **SHA**, projects `Stream: Cashflow`, `Stream: System`, `Stream: Authority`,
`Stream: Team`. Milestones are key results, issues are cards. **No Linear key is ever used
in the browser or committed to this repo.**

Buckets come from each milestone's target date: Now ≤ 8 Nov 2026, Next ≤ 6 Dec 2026,
Later ≤ 31 Dec 2026. A milestone with no target date shows as "Unscheduled"; an issue with
no milestone shows under "No key result".

## Option A: automatic (GitHub Action)

`.github/workflows/refresh-roadmap.yml` runs daily at 06:15 UTC and on demand
(Actions tab, "Run workflow"). It needs one repo secret:

1. Linear > Settings > Security & access > Personal API keys: create a read-only key.
2. GitHub repo > Settings > Secrets and variables > Actions > New secret
   `LINEAR_API_KEY`.

Without the secret the workflow just skips. With it, it runs
`python3 scripts/build_roadmap_data.py --fetch` and commits `data.json` only if something
changed; GitHub Pages then redeploys.

## Option B: locally with a key in your environment

```bash
LINEAR_API_KEY=lin_api_xxx python3 scripts/build_roadmap_data.py --fetch
git add roadmap/data.json && git commit -m "Refresh roadmap data" && git push
```

## Option C: from the Linear connector (how Grok Bot does it)

Save the connector output as `{"projects": [...get_project(includeMilestones=true) for each
stream...], "issues": [...list_issues(team="SHA")...]}` outside the repo, then:

```bash
python3 scripts/build_roadmap_data.py --from-export /path/to/linear-export.json
```
