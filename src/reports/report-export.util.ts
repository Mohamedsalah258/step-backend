import { Workbook } from 'exceljs'
import puppeteer from 'puppeteer'

const BRAND = 'FF2347E8'
const STRIPE = 'FFF5F7FB'
const BORDER = { style: 'thin' as const, color: { argb: 'FFD8DEEA' } }

function csvEscape(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function buildCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(','))
  return '﻿' + lines.join('\n') // BOM عشان اكسيل يفتح العربي صح
}

/** ملف إكسل حقيقي (مش CSV باسم مستعار) — RTL، هيدر ملوّن، حدود، تلوين متبادل، أعمدة بعرض مناسب */
export async function buildXlsx(
  sheetTitle: string,
  headers: string[],
  rows: (string | number)[][],
): Promise<Buffer> {
  const workbook = new Workbook()
  workbook.creator = 'STEP Admin'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetTitle.slice(0, 31), {
    views: [{ rightToLeft: true }],
  })

  const headerRow = sheet.addRow(headers)
  headerRow.height = 26
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }
  })

  rows.forEach((row, i) => {
    const r = sheet.addRow(row)
    r.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE } }
      }
    })
  })

  sheet.columns.forEach((col) => {
    let max = 12
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? '').length
      if (len > max) max = len
    })
    col.width = Math.min(max + 4, 45)
  })

  const buf = await workbook.xlsx.writeBuffer()
  return Buffer.from(buf)
}

export type PdfStat = { label: string; value: string }

function reportHtml(title: string, subtitle: string, stats: PdfStat[], headers: string[], rows: (string | number)[][]): string {
  const statsHtml = stats
    .map((s) => `<div class="stat"><div class="label">${s.label}</div><div class="value">${s.value}</div></div>`)
    .join('')
  const theadHtml = headers.map((h) => `<th>${h}</th>`).join('')
  const tbodyHtml = rows
    .map((r) => `<tr>${r.map((c) => `<td>${String(c)}</td>`).join('')}</tr>`)
    .join('')

  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; margin: 0; padding: 28px; color: #111827; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { font-size: 12px; color: #6b7280; margin: 0 0 20px; }
  .stats { display: flex; gap: 12px; margin-bottom: 24px; }
  .stat { flex: 1; border: 1px solid #e5e9f2; border-radius: 10px; padding: 12px 14px; }
  .stat .label { font-size: 11px; color: #6b7280; margin-bottom: 6px; }
  .stat .value { font-size: 19px; font-weight: 800; color: #111827; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e5e9f2; padding: 8px 10px; text-align: center; }
  th { background: #2347e8; color: #fff; font-weight: 700; }
  tr:nth-child(even) td { background: #f5f7fb; }
  .footer { margin-top: 18px; font-size: 10px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="subtitle">${subtitle}</p>
  <div class="stats">${statsHtml}</div>
  <table>
    <thead><tr>${theadHtml}</tr></thead>
    <tbody>${tbodyHtml}</tbody>
  </table>
  <div class="footer">STEP — لوحة تحكم الأدمن — تصدير تلقائي</div>
</body>
</html>`
}

/** PDF حقيقي عبر رندر HTML/CSS كامل بمتصفح حقيقي (Chromium) — أدق طريقة لعربي RTL صحيح */
export async function buildPdf(
  title: string,
  subtitle: string,
  stats: PdfStat[],
  headers: string[],
  rows: (string | number)[][],
): Promise<Buffer> {
  const html = reportHtml(title, subtitle, stats, headers, rows)
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
