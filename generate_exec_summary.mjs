import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType } from 'docx';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT = join(import.meta.dirname, 'Express_Powerr_Executive_Summary.docx');

const INDIGO = '1E1B4B';
const PRIMARY = '4F46E5';
const GRAY = '4B5563';
const DARK = '111827';

function heading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, color: PRIMARY })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: opts.bullet ? { level: 0 } : undefined,
    children: [new TextRun({ text, size: 20, color: DARK, bold: !!opts.bold })],
  });
}

function bodyRuns(runs) {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: undefined,
    children: runs.map(r => new TextRun({ size: 20, color: DARK, ...r })),
  });
}

function divider() {
  return new Paragraph({
    spacing: { after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' } },
    children: [],
  });
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Calibri' } },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 720, bottom: 720, left: 900, right: 900 },
      },
    },
    children: [
      // Header block
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: 'EXPRESS POWERR SDN BHD', bold: true, size: 22, color: GRAY })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: 'Smart Fleet Management System', bold: true, size: 36, color: INDIGO })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: 'Executive Summary — Proof of Concept Review', size: 22, color: GRAY })],
      }),
      divider(),

      heading('1. What Was Built'),
      body('A working Smart Fleet Management System covering the full operation: fleet vehicles, generator deployments, job dispatch, asset traceability, sales quotations with SST, invoicing, finance reporting, GPS live tracking with fuel monitoring, and SLA compliance tracking for TNB/SESB contracts.'),
      body('Status: fully functional proof of concept, demonstrated on live local environment.', { bold: true }),

      heading('2. Business Value — Where This System Protects Margin'),
      body('Fuel anomaly detection: flags abnormal fuel drops in real time — direct protection against fuel theft and drainage losses across vehicles and gensets.', { bullet: true }),
      body('SLA compliance tracking: proves contract adherence to TNB/SESB, protecting revenue from penalty clauses.', { bullet: true }),
      body('SST-compliant quoting: 8% SST calculated automatically on every quotation — tax compliance out of the box.', { bullet: true }),
      body('Single source of truth: jobs, assets, finance, and tracking in one system instead of WhatsApp groups and spreadsheets.', { bullet: true }),
      body('Faster dispatch: assignment, routing status, and completion tracked digitally — less downtime between jobs.', { bullet: true }),

      heading('3. Honest Gap Assessment — Demo vs Production'),
      bodyRuns([
        { text: 'Security: ', bold: true },
        { text: 'demo credentials only; production requires enforced password policy, HTTPS, and role-based access review.' },
      ]),
      bodyRuns([
        { text: 'Data safety: ', bold: true },
        { text: 'runs on a single machine with no off-site backup; production needs a hosted database with automated daily backups.' },
      ]),
      bodyRuns([
        { text: 'Scale: ', bold: true },
        { text: 'validated on demo data (8 vehicles, 11 generators); full-fleet load testing required.' },
      ]),
      bodyRuns([
        { text: 'GPS hardware: ', bold: true },
        { text: 'telemetry is currently simulated; live tracking needs real GPS trackers installed per vehicle/genset.' },
      ]),
      bodyRuns([
        { text: 'Continuity: ', bold: true },
        { text: 'currently maintained by one person; production handover documentation required.' },
      ]),

      heading('4. Indicative Cost to Go Live'),
      bodyRuns([
        { text: 'Cloud hosting: ', bold: true },
        { text: '~RM50–200/month (managed server + database).' },
      ]),
      bodyRuns([
        { text: 'GPS trackers: ', bold: true },
        { text: 'one-time hardware per vehicle/genset plus subscription (~RM15–30/unit/month).' },
      ]),
      bodyRuns([
        { text: 'Development hardening: ', bold: true },
        { text: 'one-off effort for security, backups, data migration, and user training.' },
      ]),

      heading('5. Recommendation & The Ask'),
      body('Approve progression from proof of concept to pilot deployment:', { bold: true }),
      body('Phase 1 — Pilot: host online, onboard 2–3 real vehicles with GPS trackers, run alongside current process for 30 days.', { bullet: true }),
      body('Phase 2 — Evaluate: measure fuel savings caught, dispatch time saved, and SLA penalty exposure avoided against pilot cost.', { bullet: true }),
      body('Phase 3 — Roll out: expand to full fleet once pilot ROI is confirmed.', { bullet: true }),
      body('The technology risk has been retired by this proof of concept. The remaining decision is an operational investment decision, best made with 30 days of real-world pilot data.'),

      divider(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
        spacing: { before: 80 },
        children: [new TextRun({ text: 'Prepared for Management Review — Internal Document', size: 16, color: GRAY, italics: true })],
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT, buffer);
console.log('Written:', OUTPUT, `(${(buffer.length / 1024).toFixed(0)} KB)`);
