# Release Guide

## The dashboard

[docs/dashboards/Release-Dashboard.md](../dashboards/Release-Dashboard.md) is the single engineering
dashboard. It is generated, never hand-edited:

```bash
npm run release-check
```

## Traffic-light rules

The rules are mechanical and stated here so nobody negotiates them at release time.

| Indicator | Condition                                                                        |
| --------- | --------------------------------------------------------------------------------- |
| **Red**   | Any failing certification row, or any open Critical technical debt                |
| **Amber** | Any blocked/unmeasured row, or any open blocking debt, or a partial measurement set |
| **Green** | Everything measured, everything passing, no blocking debt                         |

A Red in any subsystem forces a Red release recommendation. Amber releases require the listed
blockers to be accepted in writing by the owning engineer.

## Subsystems assessed

Architecture · Certification · Performance · Capability · Technical debt.

Capability is Amber for as long as StreamFlow certifies zero Tier A and zero Tier B capabilities,
which is the honest state under ADR-014.

## Release checklist

1. `npm run verify` — green.
2. `npm run certify` — pipeline completes.
3. `npm run release-check` — dashboards regenerated and committed.
4. Read [Technical-Debt.md](../dashboards/Technical-Debt.md); no open Critical item.
5. Read [Release-Dashboard.md](../dashboards/Release-Dashboard.md); record the recommendation in the
   release note verbatim, including Amber caveats.
