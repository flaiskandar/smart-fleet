import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, PageBreak, Header, Footer, PageNumber } from 'docx';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SCREENSHOT_DIR = join(import.meta.dirname, 'screenshots');
const OUTPUT = join(import.meta.dirname, 'Express_Powerr_User_Manual.docx');

const modules = [
  { file: '01_login.png', title: '1. Login', desc: 'The Login page provides secure authentication for users. Enter your username and password to access the Smart Fleet Management system.\n\nFeatures:\n- Username and password authentication\n- Remember me option for 30 days\n- Password visibility toggle\n- Demo credentials displayed for testing\n\nDemo Accounts:\n- admin / password123\n- dispatcher / password123\n- finance / password123' },
  { file: '02_dashboard.png', title: '2. Dashboard', desc: 'The Dashboard is the main landing page after login. It provides a high-level overview of fleet operations.\n\nKey Features:\n- Active Vehicles count and total\n- Generator Fleet status and deployments\n- Active Jobs with pending count\n- SLA Compliance percentage\n- SLA Compliance table by client\n- Fuel Anomaly alerts\n- Recent Jobs list\n- Download Report button for CSV export' },
  { file: '03_fleet.png', title: '3. Fleet Management', desc: 'The Fleet module manages all vehicles in the fleet.\n\nFeatures:\n- Vehicle list with status, plate number, and details\n- Add new vehicles with full details\n- Edit existing vehicle information\n- Remove vehicles from fleet\n- Search and filter capabilities\n- Vehicle status tracking (active, maintenance, idle)' },
  { file: '04_generators.png', title: '4. Generators', desc: 'The Generators module manages the generator fleet.\n\nFeatures:\n- Generator list with status and hours\n- Track hours of operation\n- Deployment location management\n- Add new generators\n- Update generator hours\n- Maintenance scheduling\n- Status tracking (deployed, idle, maintenance)' },
  { file: '05_dispatch.png', title: '5. Dispatch', desc: 'The Dispatch module handles job assignments and tracking.\n\nFeatures:\n- Job list with status filtering\n- Status options: pending, dispatched, en_route, on_site, completed, cancelled\n- Assign vehicles and drivers to jobs\n- Track real-time job progress\n- Mark jobs as complete\n- Job number tracking\n- Client assignment' },
  { file: '06_assets.png', title: '6. Assets', desc: 'The Assets module provides asset traceability across the fleet.\n\nFeatures:\n- Track equipment, tools, and assets\n- Asset condition monitoring\n- Location tracking\n- Assignment to vehicles or generators\n- Add new assets\n- Condition reports\n- Accountability tracking' },
  { file: '07_sales.png', title: '7. Sales', desc: 'The Sales module manages the sales pipeline and quotation system.\n\nFeatures:\n- Create quotes for vehicle and generator rentals\n- Track quote statuses (draft, sent, accepted, rejected)\n- Pipeline view of all active quotes\n- Client relationship management\n- Quote generation with copy-to-clipboard\n- Deposit and payment terms\n- RM (Malaysian Ringgit) pricing' },
  { file: '08_fuel.png', title: '8. Fuel Management', desc: 'The Fuel module tracks fuel consumption across the fleet.\n\nFeatures:\n- Fuel level monitoring\n- Anomaly detection (high volume refills)\n- Fuel consumption reports\n- Vehicle-level fuel tracking\n- Anomaly alerts for potential issues\n- Historical fuel data' },
  { file: '09_clients.png', title: '9. Clients', desc: 'The Clients module manages the customer database.\n\nFeatures:\n- Client information management\n- Contact details storage\n- Associated jobs tracking\n- Add new clients\n- Update existing records\n- Client history' },
  { file: '10_calendar.png', title: '10. Driver Calendar', desc: 'The Driver Calendar provides a visual calendar view of driver assignments.\n\nFeatures:\n- Calendar view of driver schedules\n- Job assignments by date\n- Driver availability tracking\n- Schedule conflict detection\n- Visual job status indicators\n- Date range navigation' },
  { file: '11_gps_playback.png', title: '11. GPS Playback', desc: 'The GPS Playback module allows you to review historical vehicle movements.\n\nFeatures:\n- Select vehicle from dropdown\n- Choose date range for playback\n- Map visualization of GPS tracks\n- Speed and fuel level telemetry\n- Track point details\n- Route replay for incident investigation' },
  { file: '12_erp_sync.png', title: '12. ERP Sync', desc: 'The ERP Sync module manages integration with external ERP systems.\n\nFeatures:\n- Sync vehicle data with ERP\n- Job record synchronization\n- Fuel log integration\n- Configure sync schedules\n- Monitor sync status\n- External system connectivity' },
];

const children = [];

// Title page
children.push(new Paragraph({ spacing: { before: 6000 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Express Powerr', bold: true, size: 72, color: '4f46e5', font: 'Calibri' })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Smart Fleet Management System', bold: true, size: 32, color: '374151', font: 'Calibri' })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'User Manual', size: 28, color: '6b7280', font: 'Calibri' })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Version 1.0', size: 20, color: '9ca3af', font: 'Calibri' })] }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Sections
for (const mod of modules) {
  const imgPath = join(SCREENSHOT_DIR, mod.file);
  const imgBuf = readFileSync(imgPath);

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: mod.title, bold: true, font: 'Calibri' })] }));

  const lines = mod.desc.split('\n');
  for (const line of lines) {
    children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: line, size: 22, font: 'Calibri' })] }));
  }

  children.push(new Paragraph({ spacing: { before: 300, after: 300 }, alignment: AlignmentType.CENTER, children: [new ImageRun({ data: imgBuf, transformation: { width: 580, height: 340 } })] }));
  children.push(new Paragraph({ children: [new PageBreak()] }));
}

const doc = new Document({
  sections: [{
    properties: {
      page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Express Powerr - User Manual', size: 16, color: '9ca3af', italics: true, font: 'Calibri' })] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 16, font: 'Calibri', color: '9ca3af' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Calibri', color: '9ca3af' })] })] }),
    },
    children,
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT, buffer);
console.log('Created: ' + OUTPUT);
console.log('Size: ' + (buffer.length / 1024).toFixed(1) + ' KB');
