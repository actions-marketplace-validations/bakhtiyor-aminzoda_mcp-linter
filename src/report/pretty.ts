import type { Report } from "../audit/report.js";
import type { Finding } from "../audit/finding.js";
import type { Severity } from "../audit/severity.js";
import type { Palette } from "./color.js";

const SUBJECT_WIDTH = 28;

export function formatPretty(report: Report, palette: Palette): string {
  const blocks: string[] = [formatHeader(report, palette)];

  if (report.findings.length === 0) {
    blocks.push(
      palette.green("No findings. Every rule that applies to this server passed."),
    );
  } else {
    blocks.push(formatFindings(report.findings, palette));
  }

  blocks.push(formatFooter(report, palette));
  return `${blocks.join("\n\n")}\n`;
}

function formatHeader(report: Report, palette: Palette): string {
  const serverName = report.server.name ?? "unknown server";
  const serverVersion = report.server.version === undefined ? "" : `@${report.server.version}`;
  const protocol = report.server.protocolVersion ?? "unknown";

  const gradeColor =
    report.scorecard.grade === "A+" || report.scorecard.grade === "A"
      ? palette.green
      : report.scorecard.grade === "B" || report.scorecard.grade === "C"
        ? palette.yellow
        : palette.red;

  const rows: Array<[string, string]> = [
    ["server", `${serverName}${serverVersion}`],
    ["protocol", protocol],
    ["command", report.server.command],
    [
      "exposed",
      [
        plural(report.counts.tools, "tool"),
        plural(report.counts.resources, "resource"),
        plural(report.counts.resourceTemplates, "template"),
        plural(report.counts.prompts, "prompt"),
      ].join(", "),
    ],
    ["scorecard", `${gradeColor(`[Grade ${report.scorecard.grade}]`)} ${report.scorecard.score}/100 (${report.scorecard.status})`],
  ];

  const width = Math.max(...rows.map(([label]) => label.length));
  const body = rows
    .map(([label, value]) => `  ${palette.dim(label.padEnd(width))}  ${value}`)
    .join("\n");

  return `${palette.bold("mcp-doctor")} ${palette.dim(report.toolVersion)}\n${body}`;
}

function formatFindings(findings: readonly Finding[], palette: Palette): string {
  const grouped = new Map<string, Finding[]>();
  for (const finding of findings) {
    const bucket = grouped.get(finding.ruleId);
    if (bucket === undefined) grouped.set(finding.ruleId, [finding]);
    else bucket.push(finding);
  }

  const sections = [...grouped.entries()].map(([ruleId, entries]) => {
    const { severity } = entries[0] as Finding;
    const heading = `${badge(severity, palette)} ${palette.bold(ruleId)} ${palette.dim(
      `(${plural(entries.length, "occurrence")})`,
    )}`;
    const lines = entries.map((finding) => formatFinding(finding, palette));
    return [heading, ...lines].join("\n");
  });

  return sections.join("\n\n");
}

function formatFinding(finding: Finding, palette: Palette): string {
  const subject = finding.subject ?? `(${finding.subjectKind})`;
  const label = subject.length >= SUBJECT_WIDTH ? `${subject}\n${" ".repeat(SUBJECT_WIDTH + 4)}` : subject.padEnd(SUBJECT_WIDTH);
  const head = `  ${palette.cyan(label)}${finding.message}`;
  return finding.hint === undefined ? head : `${head}\n${" ".repeat(SUBJECT_WIDTH + 4)}${palette.dim(`fix: ${finding.hint}`)}`;
}

function formatFooter(report: Report, palette: Palette): string {
  const { error, warn, info } = report.summary;
  const gradeColor =
    report.scorecard.grade === "A+" || report.scorecard.grade === "A"
      ? palette.green
      : report.scorecard.grade === "B" || report.scorecard.grade === "C"
        ? palette.yellow
        : palette.red;

  const parts = [
    palette.red(plural(error, "error")),
    palette.yellow(plural(warn, "warning")),
    palette.blue(plural(info, "note")),
    palette.dim("•"),
    `${gradeColor(`[Grade: ${report.scorecard.grade}]`)} ${palette.bold(`${report.scorecard.score}/100`)} (${report.scorecard.status})`,
  ];
  return `${parts.join("  ")}`;
}

function badge(severity: Severity, palette: Palette): string {
  if (severity === "error") return palette.red("error");
  if (severity === "warn") return palette.yellow("warn ");
  return palette.blue("note ");
}

function plural(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}
