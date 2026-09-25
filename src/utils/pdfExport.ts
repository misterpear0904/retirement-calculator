import jsPDF from 'jspdf';
import { SimulationResult, RetirementState } from '../types/retirement';
import { getRiskLabel } from './risk';

// ---------------------------------------------------------------------------
// Professional multi-page executive report, drawn with native jsPDF vectors
// (crisp at any zoom, no html2canvas screenshot flakiness).
// ---------------------------------------------------------------------------

const NAVY: [number, number, number] = [15, 23, 42];
const BLUE: [number, number, number] = [37, 99, 235];
const CYAN: [number, number, number] = [56, 189, 248];
const EMERALD: [number, number, number] = [16, 185, 129];
const AMBER: [number, number, number] = [245, 158, 11];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_400: [number, number, number] = [148, 163, 184];
const LIGHT_BG: [number, number, number] = [241, 245, 249];

const MARGIN = 14;
const LINE = 6;

function fmtMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

function fmtAxis(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${abs}`;
}

function riskColor(rate: number): [number, number, number] {
  if (rate >= 85) return EMERALD;
  if (rate >= 70) return BLUE;
  if (rate >= 50) return AMBER;
  return [239, 68, 68];
}

interface Ctx {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  y: number;
}

function newPage(ctx: Ctx) {
  ctx.doc.addPage();
  ctx.y = MARGIN + 8;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y + needed > ctx.pageHeight - 18) newPage(ctx);
}

function footer(ctx: Ctx) {
  const n = ctx.doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    ctx.doc.setPage(i);
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(...SLATE_400);
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.text(
      'ApexRetire Pro — planning estimates only, not financial advice.',
      MARGIN,
      ctx.pageHeight - 10
    );
    ctx.doc.text(`Page ${i} of ${n}`, ctx.pageWidth - MARGIN, ctx.pageHeight - 10, {
      align: 'right',
    });
  }
}

function coverHeader(ctx: Ctx, state: RetirementState, result: SimulationResult) {
  const { doc, pageWidth } = ctx;
  // Navy cover band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 46, 'F');
  // Accent rule
  doc.setFillColor(...BLUE);
  doc.rect(0, 46, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('ApexRetire — Executive Retirement Plan', MARGIN, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE_400);
  const date = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(
    `Prepared ${date}  ·  Age ${state.currentAge} → retire ${state.targetRetirementAge} → plan to ${state.lifeExpectancy}  ·  ${result.targetLocationName}`,
    MARGIN,
    26
  );

  // Success badge (right side of band)
  const label = getRiskLabel(result.successRate);
  const [r, g, b] = riskColor(result.successRate);
  doc.setFillColor(r, g, b);
  const badgeW = 52;
  const badgeX = pageWidth - MARGIN - badgeW;
  doc.roundedRect(badgeX, 30, badgeW, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${result.successRate}% · ${label}`, badgeX + badgeW / 2, 37.5, { align: 'center' });

  ctx.y = 56;
}

function sectionTitle(ctx: Ctx, title: string, subtitle?: string) {
  ensureSpace(ctx, 16);
  const { doc } = ctx;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...SLATE_900);
  doc.text(title, MARGIN, ctx.y);
  ctx.y += 5.5;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_500);
    doc.text(subtitle, MARGIN, ctx.y);
    ctx.y += 5;
  } else {
    ctx.y += 1;
  }
  // Underline accent
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.7);
  doc.line(MARGIN, ctx.y, MARGIN + 26, ctx.y);
  ctx.y += 5;
}

function kpiCards(ctx: Ctx, result: SimulationResult, state: RetirementState) {
  const { doc, pageWidth } = ctx;
  const cards = [
    { label: 'Success rate', value: `${result.successRate}%`, sub: 'Monte Carlo', accent: riskColor(result.successRate) },
    { label: 'Net worth at retirement', value: fmtMoney(result.targetRetirementNetWorth), sub: `Age ${state.targetRetirementAge}`, accent: BLUE },
    { label: 'Net worth at horizon', value: fmtMoney(result.finalNetWorth), sub: `Age ${state.lifeExpectancy}`, accent: CYAN },
    { label: 'Monthly spending', value: fmtMoney(result.monthlyRetirementSpending), sub: 'In retirement', accent: EMERALD },
    { label: 'Safe withdrawal rate', value: `${result.safeWithdrawalRatePct}%`, sub: 'Of retirement wealth', accent: AMBER },
    { label: 'FIRE age', value: result.fireAgeAchievable ? `Age ${result.fireAgeAchievable}` : 'At target age', sub: '25× spending rule', accent: SLATE_900 },
  ];
  const gap = 4;
  const w = (pageWidth - MARGIN * 2 - gap * 2) / 3;
  const h = 22;
  ensureSpace(ctx, h * 2 + gap + 4);
  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = MARGIN + col * (w + gap);
    const y = ctx.y + row * (h + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    // Accent bar
    doc.setFillColor(...c.accent);
    doc.roundedRect(x, y, 2.2, h, 1, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.text(c.label.toUpperCase(), x + 6, y + 6.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...SLATE_900);
    doc.text(c.value, x + 6, y + 13.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.text(c.sub, x + 6, y + 18.5);
  });
  ctx.y += h * 2 + gap + 6;
}

function drawProjectionChart(ctx: Ctx, state: RetirementState, result: SimulationResult) {
  const { doc, pageWidth } = ctx;
  const data = result.yearlyProjections;
  if (data.length === 0) return;

  const chartH = 72;
  ensureSpace(ctx, chartH + 30);
  const x0 = MARGIN + 14;
  const x1 = pageWidth - MARGIN - 4;
  const y0 = ctx.y + 8;
  const y1 = ctx.y + 8 + chartH;

  const maxV = Math.max(...data.map((p) => p.netWorth95), 1);
  const minV = Math.min(0, ...data.map((p) => p.netWorth10));
  const span = Math.max(1, maxV - minV);
  const minAge = data[0].age;
  const maxAge = data[data.length - 1].age;
  const ageSpan = Math.max(1, maxAge - minAge);

  const X = (age: number) => x0 + ((age - minAge) / ageSpan) * (x1 - x0);
  const Y = (v: number) => y1 - ((v - minV) / span) * (y1 - y0);

  // Frame
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(x0, y0, x1 - x0, y1 - y0);

  // Gridlines + y labels (4 steps)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_500);
  for (let i = 0; i <= 4; i++) {
    const v = minV + (span * i) / 4;
    const y = Y(v);
    doc.setDrawColor(241, 245, 249);
    doc.line(x0, y, x1, y);
    doc.text(fmtAxis(v), x0 - 1.5, y + 1.2, { align: 'right' });
  }
  // X labels every ~10 years
  const step = Math.max(5, Math.round(ageSpan / 6 / 5) * 5);
  for (let age = minAge; age <= maxAge; age += step) {
    doc.text(`${age}`, X(age), y1 + 4.5, { align: 'center' });
  }
  doc.text('Age', (x0 + x1) / 2, y1 + 9, { align: 'center' });

  const polyline = (
    key: 'netWorth50' | 'netWorth95' | 'netWorth10',
    color: [number, number, number],
    width: number,
    dashed: boolean
  ) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    if (dashed) doc.setLineDashPattern([1.6, 1.2], 0);
    else doc.setLineDashPattern([], 0);
    let prevX: number | null = null;
    let prevY: number | null = null;
    for (const p of data) {
      const x = X(p.age);
      const y = Y(p[key]);
      if (prevX != null && prevY != null) doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
    doc.setLineDashPattern([], 0);
  };

  // Stress band fill (light) between conservative and stress
  doc.setFillColor(245, 158, 11);
  // (fill via many vertical slices at low opacity is not supported — draw faint area using light gray polygon)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);

  polyline('netWorth95', EMERALD, 0.6, true);
  polyline('netWorth10', AMBER, 0.6, true);
  polyline('netWorth50', BLUE, 1.1, false);

  // Retirement marker
  const rx = X(state.targetRetirementAge);
  if (rx >= x0 && rx <= x1) {
    doc.setDrawColor(168, 85, 247);
    doc.setLineWidth(0.6);
    doc.setLineDashPattern([2, 1.4], 0);
    doc.line(rx, y0, rx, y1);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(7.5);
    doc.setTextColor(168, 85, 247);
    doc.text(`Retire ${state.targetRetirementAge}`, rx + 1.5, y0 + 4);
  }

  // Milestone dots on target line
  doc.setFillColor(...BLUE);
  for (const p of data) {
    if (p.milestones.length > 0) {
      doc.circle(X(p.age), Y(p.netWorth50), 1.1, 'F');
    }
  }

  ctx.y = y1 + 13;

  // Legend
  doc.setFontSize(8);
  const legend: Array<{ label: string; color: [number, number, number] }> = [
    { label: 'Target', color: BLUE },
    { label: 'Conservative', color: EMERALD },
    { label: 'Stress test', color: AMBER },
  ];
  let lx = x0;
  doc.setFont('helvetica', 'normal');
  for (const l of legend) {
    doc.setFillColor(...l.color);
    doc.circle(lx + 1.5, ctx.y - 1.2, 1.4, 'F');
    doc.setTextColor(...SLATE_900);
    doc.text(l.label, lx + 4.5, ctx.y);
    lx += 14 + l.label.length * 1.5;
  }
  ctx.y += LINE + 2;
}

function kvTable(ctx: Ctx, rows: Array<[string, string]>) {
  const { doc, pageWidth } = ctx;
  const colW = pageWidth - MARGIN * 2;
  for (const [k, v] of rows) {
    ensureSpace(ctx, LINE);
    const stripe = Math.floor(ctx.y) % 2 === 0;
    if (stripe) {
      doc.setFillColor(...LIGHT_BG);
      doc.rect(MARGIN, ctx.y - 4.2, colW, LINE, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_900);
    doc.text(k, MARGIN + 2, ctx.y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(v, MARGIN + 72, ctx.y);
    ctx.y += LINE;
  }
  ctx.y += 3;
}

function inputsSection(ctx: Ctx, state: RetirementState, result: SimulationResult) {
  sectionTitle(ctx, 'Plan inputs', 'Everything this projection is based on');

  const totalSaved =
    state.liquidCash + state.taxableInvestments + state.preTax401k + state.postTaxRothHsa;
  const allocation = `${state.stockPct}% stocks / ${state.bondPct}% bonds / ${state.cashPct}% cash`;
  const housing =
    state.housingType === 'rent'
      ? `Rent ${fmtMoney(state.rentMonthly)}/mo (+${state.rentInflationPct}%/yr)`
      : `Mortgage ${fmtMoney(state.mortgageBalance)} bal · ${fmtMoney(state.mortgageMonthly)}/mo · ${state.mortgageInterestRate}% · ${state.mortgageRemainingYears}y left`;
  const incomeGrowth =
    state.realIncomeGrowthMode === 'custom'
      ? `${state.customIncomeGrowthRate}% custom`
      : state.realIncomeGrowthMode === 'aggressive_5'
        ? 'Aggressive 5%'
        : 'Standard 2%';
  const inflation =
    state.inflationMode === 'custom'
      ? `${state.customInflationRate}% custom`
      : state.inflationMode === 'historical_replay'
        ? `Historical replay (${state.historicalInflationPreset})`
        : 'Fixed 3%';

  kvTable(ctx, [
    ['Timeline', `Age ${state.currentAge} → retire ${state.targetRetirementAge} → plan to ${state.lifeExpectancy}`],
    ['Current savings', `${fmtMoney(totalSaved)} (cash ${fmtMoney(state.liquidCash)} · taxable ${fmtMoney(state.taxableInvestments)} · pre-tax ${fmtMoney(state.preTax401k)} · Roth/HSA ${fmtMoney(state.postTaxRothHsa)})`],
    ['Income', `${fmtMoney(state.currentAnnualIncome)}/yr · saving ${state.savingsRatePct}% · growth ${incomeGrowth}`],
    ['Contributions', state.useFixedContribution ? `${fmtMoney(state.fixedAnnualContribution)}/yr fixed` : `${state.contributionSplit.preTaxPct}/${state.contributionSplit.postTaxPct}/${state.contributionSplit.taxablePct} pre-tax/Roth/taxable`],
    ['Market', `${allocation} · stock ${state.customStockReturn}% / bond ${state.customBondReturn}% · ${state.returnMode}`],
    ['Inflation', inflation],
    ['Housing', housing],
    ['Lifestyle', `${state.lifestyleTier} · ${fmtMoney(state.essentialExpensesMonthly + state.discretionaryExpensesMonthly)}/mo`],
    ['Location', `${result.targetLocationName} · COL ×${result.colMultiplier.toFixed(2)}`],
    ['Guaranteed income', `SS ${fmtMoney(state.socialSecurityMonthlyAt67)}/mo @${state.socialSecurityStartAge} · pension ${fmtMoney(state.pensionMonthly)}/mo @${state.pensionStartAge}`],
  ]);

  if (state.hasChildren && state.children.length > 0) {
    ensureSpace(ctx, 12);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(10);
    ctx.doc.setTextColor(...SLATE_900);
    ctx.doc.text('Dependents & education', MARGIN, ctx.y);
    ctx.y += LINE;
    kvTable(
      ctx,
      state.children.map((c) => [
        `${c.name || 'Child'} (age ${c.currentAge})`,
        `${c.schoolType === 'private_k12' ? `Private K-12 ${fmtMoney(c.privateAnnualCost)}/yr · ` : 'Public K-12 · '}${c.collegeTier === 'none' ? 'no college' : `${c.collegeTier === 'in_state' ? 'In-state' : 'Private'} college ${fmtMoney(c.collegeAnnualCost)}/yr × ${c.collegeYears}y`}`,
      ])
    );
  }

  const withMilestones = result.yearlyProjections.filter((p) => p.milestones.length > 0);
  if (withMilestones.length > 0) {
    ensureSpace(ctx, 12);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(10);
    ctx.doc.setTextColor(...SLATE_900);
    ctx.doc.text('Key milestones', MARGIN, ctx.y);
    ctx.y += LINE;
    kvTable(
      ctx,
      withMilestones.slice(0, 12).map((p) => [
        `Age ${p.age} (${p.year})`,
        p.milestones.map((m) => m.title).join(' · '),
      ])
    );
  }
}

function scheduleSection(ctx: Ctx, result: SimulationResult) {
  sectionTitle(
    ctx,
    'Year-by-year schedule (target scenario)',
    'Contributions, expenses, withdrawals and net worth'
  );
  const { doc, pageWidth } = ctx;
  const cols = [
    { h: 'Age', w: 14 },
    { h: 'Year', w: 16 },
    { h: 'Phase', w: 22 },
    { h: 'Contrib.', w: 24, r: true },
    { h: 'Expenses', w: 26, r: true },
    { h: 'Withdrawal', w: 28, r: true },
    { h: 'Net worth', w: 0, r: true }, // fills remainder
  ];
  const tableW = pageWidth - MARGIN * 2;
  const fixedW = cols.slice(0, -1).reduce((a, c) => a + c.w, 0);
  cols[cols.length - 1].w = tableW - fixedW;

  const header = () => {
    ensureSpace(ctx, 10);
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, ctx.y - 4.5, tableW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let x = MARGIN + 2;
    for (const c of cols) {
      if (c.r) doc.text(c.h, x + c.w - 2, ctx.y, { align: 'right' });
      else doc.text(c.h, x, ctx.y);
      x += c.w;
    }
    ctx.y += 6;
  };

  header();
  doc.setFontSize(8);
  result.yearlyProjections.forEach((p, i) => {
    ensureSpace(ctx, LINE - 1);
    if (i % 2 === 1) {
      doc.setFillColor(...LIGHT_BG);
      doc.rect(MARGIN, ctx.y - 4, tableW, 5.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const vals = [
      `${p.age}`,
      `${p.year}`,
      p.isRetired ? 'Retired' : 'Work',
      p.totalContributions > 0 ? `+${fmtMoney(p.totalContributions)}` : '–',
      fmtMoney(p.totalExpenses),
      p.netWithdrawalNeeded > 0 ? fmtMoney(p.netWithdrawalNeeded) : '–',
      fmtMoney(p.netWorth50),
    ];
    let x = MARGIN + 2;
    vals.forEach((v, ci) => {
      if (ci === vals.length - 1) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...SLATE_900);
      }
      if (cols[ci].r) doc.text(v, x + cols[ci].w - 2, ctx.y, { align: 'right' });
      else doc.text(v, x, ctx.y);
      if (ci === vals.length - 1) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      }
      x += cols[ci].w;
    });
    ctx.y += 5.5;
  });
  ctx.y += 2;
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_500);
  doc.text(
    'Target scenario shown. Conservative and stress bands are visualised in the chart above.',
    MARGIN,
    ctx.y
  );
  ctx.y += LINE;
}

export async function exportToPdf(
  _elementId: string,
  state: RetirementState,
  result: SimulationResult
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const ctx: Ctx = {
    doc,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    y: MARGIN,
  };

  coverHeader(ctx, state, result);
  kpiCards(ctx, result, state);

  sectionTitle(ctx, 'Net worth projection', 'Target, conservative and stress-test scenarios');
  drawProjectionChart(ctx, state, result);

  inputsSection(ctx, state, result);
  scheduleSection(ctx, result);

  footer(ctx);
  doc.save(`ApexRetire_Plan_${new Date().toISOString().slice(0, 10)}.pdf`);
}
