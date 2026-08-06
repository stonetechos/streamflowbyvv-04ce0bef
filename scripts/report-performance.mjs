#!/usr/bin/env node
/**
 * Performance dashboard generator — M0.5 WP4.
 *
 * Reads every evidence run and reports the three-value budget per C4:
 * Provisional Target, Measured Baseline, Certified Threshold. Metrics with no
 * measurement print Unknown. `blocked` and `unmeasured` never roll up as pass.
 */
import { join } from "node:path";
import {
  EVIDENCE_ROOT,
  generatedHeader,
  latestRun,
  loadAllRuns,
  loadRegistry,
  recordsById,
  unknown,
  writeFileEnsured,
} from "./lib/evidence-io.mjs";

const { metrics } = loadRegistry("metrics");
const runs = loadAllRuns();
const current = latestRun();

if (!current) {
  console.error("No evidence runs found. Run `npm run cert` before generating the dashboard.");
  process.exit(1);
}

const byRun = runs.map((run) => ({ runId: run.runId, records: recordsById(run) }));
const currentRecords = recordsById(current);

function cell(record, metric) {
  if (!record) return { baseline: null, status: "Unknown" };
  const value = record.metric ? record.metric[metric.percentile] : null;
  return { baseline: value, status: record.status };
}

const rows = metrics.map((metric) => {
  const record = currentRecords.get(metric.evidenceId);
  const { baseline, status } = cell(record, metric);
  return {
    ...metric,
    baseline,
    status,
    sampleCount: record?.metric?.sampleCount ?? null,
    detail: record?.detail ?? "",
  };
});

const json = {
  generatedAt: new Date().toISOString(),
  runId: current.runId,
  metrics: rows.map((row) => ({
    metricId: row.metricId,
    evidenceId: row.evidenceId,
    percentile: row.percentile,
    provisionalTargetMs: row.provisionalTargetMs,
    measuredBaselineMs: row.baseline,
    certifiedThresholdMs: row.certifiedThresholdMs,
    status: row.status,
    sampleCount: row.sampleCount,
  })),
  history: byRun.map((run) => ({
    runId: run.runId,
    values: Object.fromEntries(
      metrics.map((metric) => [
        metric.metricId,
        run.records.get(metric.evidenceId)?.metric?.[metric.percentile] ?? null,
      ]),
    ),
  })),
};

writeFileEnsured(
  join(EVIDENCE_ROOT, current.runId, "metrics", "performance.json"),
  JSON.stringify(json, null, 2),
);

let md = generatedHeader("Performance Dashboard", "`scripts/report-performance.mjs`");
md += `\nRun: \`${current.runId}\` · Commit: \`${current.records[0]?.commit ?? "unknown"}\` · Environment: \`${current.records[0]?.environmentProfile ?? "unknown"}\` · Region: \`${current.records[0]?.region ?? "unknown"}\`\n`;
md += `\nA metric with no measurement in this run reads **Unknown**. A Certified Threshold is only set by a human after a Measured Baseline exists (C4 rule 5). \`blocked\` and \`unmeasured\` never count as pass.\n`;

md += `\n## Three-value budget\n\n| Metric | Percentile | Provisional target | Measured baseline | Certified threshold | Samples | Status |\n| --- | --- | --- | --- | --- | --- | --- |\n`;
for (const row of rows) {
  md += `| ${row.label} | ${row.percentile} | ${row.provisionalTargetMs} ms | ${row.baseline === null ? "Unknown" : `${row.baseline} ms`} | ${unknown(row.certifiedThresholdMs)} | ${unknown(row.sampleCount)} | ${row.status} |\n`;
}

md += `\n## Historical comparison\n\n| Run | ${metrics.map((m) => m.metricId).join(" | ")} |\n| --- | ${metrics.map(() => "---").join(" | ")} |\n`;
for (const run of byRun) {
  const cells = metrics.map((metric) => {
    const value = run.records.get(metric.evidenceId)?.metric?.[metric.percentile];
    return value === undefined || value === null ? "Unknown" : `${value} ms`;
  });
  md += `| \`${run.runId}\` | ${cells.join(" | ")} |\n`;
}

md += `\n## Measurement notes\n\n`;
for (const row of rows) {
  md += `- **${row.label}** (\`${row.evidenceId}\`): ${row.detail || "No measurement recorded in this run."}\n`;
}

writeFileEnsured("docs/dashboards/Performance-Dashboard.md", md);
console.log(`Performance dashboard written for ${current.runId} (${rows.length} metrics).`);
