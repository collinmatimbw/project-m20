import type { jsPDF } from 'jspdf';
import type { Project } from '../types';
import { CURRENCY, formatInrAsTSh } from './currency';

const M20 = {
  ink: [22, 22, 22] as [number, number, number],
  slate: [98, 98, 98] as [number, number, number],
  accent: [13, 148, 136] as [number, number, number],
  warn: [180, 83, 9] as [number, number, number],
  line: [216, 216, 216] as [number, number, number],
  soft: [244, 244, 244] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_Y = PAGE_H - 13;

/**
 * Loads a project image and returns a PNG data URL, or null if anything fails.
 *
 * jsPDF cannot place a JPEG by URL, so the file is decoded through an <img> and
 * re-encoded on a canvas. Failures are swallowed: a missing or corrupt image just
 * means the sheet is exported without a banner.
 */
async function imageToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;

    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('decode failed'));
        el.src = url;
      });

      const w = 900;
      const h = Math.round((img.naturalHeight / img.naturalWidth) * w) || 300;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

export async function generateProjectSpecSheet(
  project: Project,
  fieldNote?: string
): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const d = project.description;

  let y = 0;
  let page = 1;

  const hex = (c: [number, number, number]) =>
    '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('');

  /* ---------- primitives ---------- */

  const footer = () => {
    doc.setDrawColor(...M20.line);
    doc.setLineWidth(0.2);
    doc.line(M, FOOTER_Y - 5, PAGE_W - M, FOOTER_Y - 5);
    doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...M20.slate);
    doc.text('M20 LEARNING INDEX', M, FOOTER_Y);
    doc.text(
      'Personal study reference. Source: nevonprojects.com',
      PAGE_W / 2,
      FOOTER_Y,
      { align: 'center' }
    );
    doc.text(`SHEET ${String(page).padStart(2, '0')}`, PAGE_W - M, FOOTER_Y, { align: 'right' });
  };

  const need = (space: number) => {
    if (y + space > FOOTER_Y - 8) {
      footer();
      doc.addPage();
      page += 1;
      y = M;
      // running header on continuation pages
      doc.setFont('courier', 'bold').setFontSize(6.5).setTextColor(...M20.slate);
      doc.text(`${project.id}  ${project.title.toUpperCase()}`, M, y);
      doc.setDrawColor(...M20.line);
      doc.line(M, y + 1.5, PAGE_W - M, y + 1.5);
      y += 7;
    }
  };

  const h1 = (text: string) => {
    need(12);
    y += 4;
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...M20.ink);
    doc.text(text.toUpperCase(), M, y);
    y += 2;
    doc.setDrawColor(...M20.accent).setLineWidth(0.7);
    doc.line(M, y, M + 22, y);
    y += 6;
  };

  const h2 = (text: string) => {
    need(10);
    y += 2.5;
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...M20.ink);
    doc.text(text, M, y);
    doc.setDrawColor(...M20.line).setLineWidth(0.2);
    doc.line(M, y + 1.2, PAGE_W - M, y + 1.2);
    y += 5;
  };

  const para = (text: string, size = 8.4) => {
    doc.setFont('helvetica', 'normal').setFontSize(size).setTextColor(...M20.ink);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      need(5);
      doc.text(line, M, y);
      y += size * 0.38 + 0.9;
    }
    y += 1.5;
  };

  const bullets = (items: string[]) => {
    doc.setFontSize(8.4);
    items.forEach((item) => {
      const lines = doc.splitTextToSize(item, CONTENT_W - 6) as string[];
      lines.forEach((line, i) => {
        need(5);
        if (i === 0) {
          doc.setTextColor(...M20.accent).setFont('helvetica', 'bold');
          doc.text('▪', M + 1, y);
          doc.setTextColor(...M20.ink).setFont('helvetica', 'normal');
        }
        doc.text(line, M + 6, y);
        y += 8.4 * 0.38 + 0.9;
      });
      y += 0.6;
    });
    y += 1;
  };

  const table = (
    head: string[],
    widths: number[],
    rows: string[][],
    opts: { zebra?: boolean; align?: ('left' | 'right' | 'center')[] } = {}
  ) => {
    const { zebra = true, align = [] } = opts;
    const lineH = 5;

    const drawHead = () => {
      need(10);
      doc.setFillColor(...M20.ink);
      doc.rect(M, y - 3.6, CONTENT_W, lineH, 'F');
      doc.setFont('helvetica', 'bold').setFontSize(7.2).setTextColor(255, 255, 255);
      let x = M;
      head.forEach((h, i) => {
        const a = align[i] ?? 'left';
        if (a === 'right') doc.text(h, x + widths[i] - 1.8, y, { align: 'right' });
        else if (a === 'center') doc.text(h, x + widths[i] / 2, y, { align: 'center' });
        else doc.text(h, x + 1.8, y);
        x += widths[i];
      });
      y += lineH - 0.5;
    };

    drawHead();

    rows.forEach((row, ri) => {
      if (y + lineH > FOOTER_Y - 8) {
        footer();
        doc.addPage();
        page += 1;
        y = M + 7;
        drawHead();
      }
      if (zebra && ri % 2 === 1) {
        doc.setFillColor(...M20.soft);
        doc.rect(M, y - 3.4, CONTENT_W, lineH, 'F');
      }
      doc.setFont('helvetica', 'normal').setFontSize(7.2).setTextColor(...M20.ink);
      let x = M;
      row.forEach((cell, i) => {
        const a = align[i] ?? 'left';
        const lines = doc.splitTextToSize(cell, widths[i] - 3.2) as string[];
        const txt = lines[0] ?? '';
        if (a === 'right') doc.text(txt, x + widths[i] - 1.8, y, { align: 'right' });
        else if (a === 'center') doc.text(txt, x + widths[i] / 2, y, { align: 'center' });
        else doc.text(txt, x + 1.8, y);
        x += widths[i];
      });
      y += lineH;
      doc.setDrawColor(...M20.line).setLineWidth(0.1);
      doc.line(M, y - 3.2, PAGE_W - M, y - 3.2);
    });
    y += 3;
  };

  const callout = (title: string, items: string[], color: [number, number, number] = M20.warn) => {
    doc.setFontSize(7.8);
    const allLines = items.flatMap((i) => doc.splitTextToSize(i, CONTENT_W - 8) as string[]);
    const boxH = allLines.length * 3.9 + 9;
    if (y + boxH > FOOTER_Y - 8) {
      footer();
      doc.addPage();
      page += 1;
      y = M;
    }
    doc.setFillColor(252, 251, 247);
    doc.rect(M, y - 4, CONTENT_W, boxH, 'F');
    doc.setDrawColor(...color).setLineWidth(0.8);
    doc.line(M, y - 4, M, y - 4 + boxH);
    doc.setFont('helvetica', 'bold').setFontSize(7.4).setTextColor(...color);
    doc.text(`▲  ${title.toUpperCase()}`, M + 3, y);
    y += 4.2;
    doc.setFont('helvetica', 'normal').setTextColor(...M20.ink);
    allLines.forEach((line) => {
      doc.text(line, M + 5, y);
      y += 3.9;
    });
    y += 4;
  };

  const metaChip = (label: string, value: string, x: number, w: number) => {
    doc.setFillColor(...M20.soft);
    doc.rect(x, y - 4.4, w, 11, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(5.8).setTextColor(...M20.slate);
    doc.text(label.toUpperCase(), x + 2, y - 0.6);
    doc.setFont('helvetica', 'bold').setFontSize(8.6).setTextColor(...M20.ink);
    doc.text(value, x + 2, y + 4.4);
  };

  /* ---------- page 1: title block ---------- */

  const banner = project.image ? await imageToDataUrl(project.image) : null;

  doc.setFillColor(...M20.ink);
  doc.rect(0, 0, PAGE_W, 34, 'F');
  doc.setFillColor(...M20.accent);
  doc.rect(0, 33.2, PAGE_W, 1.4, 'F');

  doc.setFont('courier', 'bold').setFontSize(9).setTextColor(94, 234, 212);
  doc.text('M20', M, 13);
  doc.setFont('courier', 'normal').setFontSize(6.6).setTextColor(148, 197, 224);
  doc.text('LEARNING INDEX', M + 13, 13);

  doc.setFont('courier', 'normal').setFontSize(6.4).setTextColor(148, 197, 224);
  doc.text('PROJECT SPECIFICATION SHEET', PAGE_W - M, 13, { align: 'right' });
  doc.setFont('courier', 'bold').setFontSize(6.4).setTextColor(255, 255, 255);
  doc.text(project.id, PAGE_W - M, 19, { align: 'right' });

  y = 44;

  if (banner) {
    /* Letterbox to a 16:7 strip, full content width, and page-break if needed. */
    const stripH = CONTENT_W / (16 / 7);
    if (y + stripH > FOOTER_Y - 10) {
      doc.addPage();
      page += 1;
      y = M + 4;
    }
    try {
      const dims = doc.getImageProperties(banner);
      const ratio = dims.height / dims.width;
      const targetH = CONTENT_W / (16 / 7);
      const drawW = ratio > 0 ? Math.min(CONTENT_W, targetH / ratio) : CONTENT_W;
      const drawH = drawW * ratio;
      const drawX = M + (CONTENT_W - drawW) / 2;
      const drawY = y + (targetH - drawH) / 2;

      doc.setFillColor(244, 244, 244);
      doc.rect(M, y, CONTENT_W, targetH, 'F');
      doc.addImage(banner, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
      doc.setDrawColor(...M20.line);
      doc.setLineWidth(0.2);
      doc.rect(M, y, CONTENT_W, targetH, 'S');
      y += targetH + 8;
    } catch {
      /* keep the title block even if placement fails */
    }
  }

  doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...M20.ink);
  const titleLines = doc.splitTextToSize(project.title, CONTENT_W) as string[];
  titleLines.forEach((l) => {
    doc.text(l, M, y);
    y += 7.4;
  });
  y += 2;

  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...M20.slate);
  doc.text(
    `${project.branch.toUpperCase()}  /  ${project.category.toUpperCase()}`,
    M,
    y
  );
  y += 10;

  const chipW = CONTENT_W / 4;
  metaChip('Level', project.level, M, chipW - 1.5);
  metaChip('Duration', project.duration, M + chipW, chipW - 1.5);
  metaChip('Branch', project.branch, M + chipW * 2, chipW - 1.5);
  metaChip('Sheet', `1 of ${1}`, M + chipW * 3, chipW - 1.5);
  y += 16;

  doc.setDrawColor(...M20.line).setLineWidth(0.2);
  doc.line(M, y, PAGE_W - M, y);
  y += 6;

  h1('01  Overview');
  para(d.overview);

  h1('02  Problem Statement');
  para(d.problemStatement);

  h1('03  Learning Objectives');
  bullets(d.learningObjectives);

  h1('04  Prerequisites');
  bullets(d.prerequisites);

  h1('05  System Architecture');
  para(d.systemArchitecture);

  /* ---------- build phases ---------- */

  h1('06  Build Phases');
  d.buildPhases.forEach((phase) => {
    need(22);
    y += 2;
    doc.setFillColor(...M20.accent);
    doc.rect(M, y - 3.4, 12, 6.4, 'F');
    doc.setFont('courier', 'bold').setFontSize(7).setTextColor(255, 255, 255);
    doc.text(`P${phase.phase}`, M + 1.6, y + 0.6);
    doc.setFont('helvetica', 'bold').setFontSize(9.4).setTextColor(...M20.ink);
    doc.text(phase.title, M + 14, y + 0.6);
    doc.setFont('courier', 'normal').setFontSize(6.8).setTextColor(...M20.slate);
    doc.text(phase.duration, PAGE_W - M, y + 0.6, { align: 'right' });
    y += 5.5;
    para(phase.description, 8.2);
    h2('Tasks');
    bullets(phase.tasks);
    if (phase.deliverables.length) {
      h2('Phase Deliverables');
      bullets(phase.deliverables);
    }
    doc.setDrawColor(...M20.line).setLineWidth(0.2);
    doc.line(M, y, PAGE_W - M, y);
    y += 2;
  });

  /* ---------- BOM ---------- */

  h1('07  Bill of Materials');
  const bomRows = d.billOfMaterials.map((i) => [
    i.component,
    i.specification,
    String(i.quantity),
    formatInrAsTSh(Number(i.estimatedCost) || 0),
    i.notes ?? '—',
  ]);
  table(
    ['Component', 'Specification', 'Qty', `Unit (${CURRENCY})`, 'Notes'],
    [38, 52, 10, 20, CONTENT_W - 120],
    bomRows,
    { align: ['left', 'left', 'center', 'right', 'left'] }
  );
  doc.setFont('helvetica', 'italic').setFontSize(7.4).setTextColor(...M20.slate);
  const costValues = d.billOfMaterials.map((i) => Number(i.estimatedCost) || 0);
  const total = costValues.reduce((a, b) => a + b, 0);
  doc.text(
    `Indicative total component cost: ${formatInrAsTSh(total)} (excluding tools, consumables and shipping).`,
    M,
    y
  );
  y += 6;

  /* ---------- validation ---------- */

  h1('08  Validation Checklist');
  const checkRows = d.validationChecklist.map((c, i) => [String(i + 1).padStart(2, '0'), '☐', c]);
  table(
    ['#', '', 'Acceptance Criterion'],
    [9, 7, CONTENT_W - 16],
    checkRows,
    { align: ['left', 'center', 'left'] }
  );

  /* ---------- troubleshooting ---------- */

  h1('09  Troubleshooting Guide');
  table(
    ['Symptom', 'Probable Cause', 'Corrective Action'],
    [44, 44, CONTENT_W - 88],
    d.troubleshootingGuide.map((t) => [t.issue, t.cause, t.solution])
  );

  /* ---------- extensions ---------- */

  h1('10  Extension Ideas');
  bullets(d.extensionIdeas);

  h1('11  Deliverables');
  table(
    ['#', 'Deliverable'],
    [9, CONTENT_W - 9],
    d.deliverables.map((dv, i) => [String(i + 1).padStart(2, '0'), dv])
  );

  /* ---------- safety ---------- */

  h1('12  Safety Notes');
  callout('Read Before Building', d.safetyNotes);

  /* ---------- field note ---------- */

  if (fieldNote && fieldNote.trim()) {
    h1('13  Field Notes');
    doc.setFont('helvetica', 'normal').setFontSize(8.2).setTextColor(...M20.ink);
    const noteLines = doc.splitTextToSize(fieldNote.trim(), CONTENT_W) as string[];
    const boxH = noteLines.length * 3.7 + 8;
    if (y + boxH > FOOTER_Y - 8) {
      footer();
      doc.addPage();
      page += 1;
      y = M;
    }
    doc.setFillColor(247, 250, 252);
    doc.setDrawColor(...M20.line);
    doc.setLineWidth(0.2);
    doc.rect(M, y - 4, CONTENT_W, boxH, 'F');
    noteLines.forEach((line) => {
      doc.text(line, M + 3, y);
      y += 3.7;
    });
    y += 4;
  }

  /* ---------- close ---------- */

  y += 4;
  if (y > FOOTER_Y - 16) {
    footer();
    doc.addPage();
    page += 1;
    y = M;
  }
  doc.setDrawColor(...M20.line).setLineWidth(0.2);
  doc.line(M, y, PAGE_W - M, y);
  y += 4;
  doc.setFont('courier', 'normal').setFontSize(6.4).setTextColor(...M20.slate);
  doc.text(
    `END OF SPECIFICATION  //  ${project.id}  //  GENERATED ${new Date().toLocaleDateString('en-GB')}`,
    M,
    y
  );
  y += 3.4;
  doc.setFont('helvetica', 'italic').setFontSize(6.4);
  doc.text(
    `Content is a personal study reference compiled from nevonprojects.com; project image from the same source. Verify every component rating and safety requirement before building. Estimated costs are indicative only. Sheet count: ${page}. Accent ${hex(M20.accent)}.`,
    M,
    y
  );

  footer();
  return doc;
}

export async function downloadProjectSpecSheet(
  project: Project,
  fieldNote?: string
): Promise<void> {
  const doc = await generateProjectSpecSheet(project, fieldNote);
  const safe = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  doc.save(`M20-${project.id}-${safe}.pdf`);
}
