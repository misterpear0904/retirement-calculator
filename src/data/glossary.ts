// Plain-English definitions for financial jargon used across the app.
// Rendered via the InfoTip component.

export const GLOSSARY: Record<string, string> = {
  successRate:
    'Share of 500 simulated market futures where your money lasts to the end of the plan. 80%+ is generally considered safe.',
  monteCarlo:
    "A simulation that replays your plan 500 times with randomly sampled market returns and inflation, so a single lucky average can't hide risk.",
  swr: 'Spend Rate: your retirement-year spending as a share of your retirement-year wealth — 4% means exactly 25x coverage. Near or below 4% is the classic comfort zone (updated annually for inflation).',
  coastFire:
    'Coast FIRE: the age when your portfolio could grow to the FIRE number by your retirement age with zero further contributions — saving could stop while compounding does the rest.',
  smile:
    'Spending smile: front-load or back-load retirement spending (travel early, more care late). The engine scales your lifestyle budget by the phase you are in each year.',
  historyReplay:
    'Replays a real decade of returns and inflation year by year (e.g. the 1970s or the 2000s crashes) instead of smooth averages - a stress test on the actual sequence. After the preset ends, its last year holds.',
  seqReplay:
    'Sequence Replay (Seq. Replay): replays a multi-decade historical sequence of inflation (and optionally returns) year by year instead of a flat assumption - a stress test against real history.',
  histReal:
    'Historical Real (Hist. Real): replays both the returns and the inflation of a selected historical period, year by year, so the plan faces an actual historical market path.',
  fireAge:
    'The age your invested assets first cover 25x your yearly retirement spending — the classic Financial Independence threshold.',
  col: 'Cost-of-Living multiplier. 1.00 = US average; 0.62 (Lisbon) means retirement spending stretches ~38% further.',
  bands:
    'Three deterministic paths: expected returns (Target), +2% returns (Conservative), and -2.5% returns with higher inflation (Stress Test). Not statistical percentiles.',
  rothConversion:
    'Moving money from pre-tax (401k/IRA) to Roth in low-income years. You pay income tax now so withdrawals later — including growth — are tax-free.',
  rmd: 'Required Minimum Distribution: the IRS forces yearly pre-tax withdrawals from your start age (balance ÷ life-expectancy factor), taxed as income. Start age is 73 if born 1951-1959, 75 if born 1960+.',
  brackets:
    'The US taxes ordinary income in slices (10%-37% for 2026) after a standard deduction ($16.1k single / $32.2k joint). Only income inside each slice pays that slice\u2019s rate.',
  guardrails:
    'A dynamic-spending rule: after a year your portfolio falls, trim spending by a set % instead of withdrawing the full amount. Small cuts early prevent big shortfalls late.',
  sequenceRisk:
    'The risk that poor returns arrive early in retirement, when withdrawals amplify the damage. Two identical average returns can produce very different outcomes.',
  lifeExpectancy:
    'How long the plan must last. Money left at this age counts as success; running out a year earlier counts as failure.',
  savingsRate:
    'Share of gross income saved yearly. The single most powerful lever before age 50 — more than asset allocation.',
  ssClaim:
    'Claiming before 67 shrinks checks (~6.7%/yr); waiting past 67 grows them (8%/yr to 70). Lifetime total depends on how long you live.',
  healthcare:
    'Medical costs historically rise ~5-6% yearly — faster than general inflation — and are weighted by your destination\u2019s healthcare index.',
  cola: 'Cost-of-living adjustments: Social Security and pensions in this model grow with inflation each year once claimed.',
  expenseDrag:
    'Fund fees compound against you. A 1% yearly fee on a $500k portfolio costs roughly $5k in year one and much more over decades.',
  sensitivity:
    'One-at-a-time stress test: each input is nudged up and down while the rest freeze, revealing which lever moves your success rate most.',
  scenarios:
    'Named snapshots of your full inputs (e.g. "Retire 60 Austin" vs "Retire 62 Lisbon") so you can compare two futures side by side.',
  decumulation:
    'The spend-down phase after retirement: living off savings, Social Security, and pensions instead of a paycheck.',
  survivorBenefit:
    'When one partner dies, the survivor keeps the larger of the two Social Security checks — modeled automatically here.',
  dieWithZero:
    'Takes your projected leftover at the end of the plan and converts it into extra yearly retirement spending (today\u2019s dollars) that would roughly spend it down to $0. Median-path estimate - spending more lowers your success rate.',
  todaysDollars:
    "Today's dollars: amounts expressed in current purchasing power, with inflation stripped out, so a future dollar reads as what it buys today.",
};

export function glossary(term: string): string {
  return GLOSSARY[term] ?? term;
}

// Polished display phrases for InfoTip aria-labels ("What is X?").
export const GLOSSARY_LABELS: Record<string, string> = {
  successRate: 'success rate',
  monteCarlo: 'Monte Carlo',
  swr: 'SWR (safe withdrawal rate)',
  coastFire: 'Coast FIRE',
  smile: 'spending smile',
  historyReplay: 'history replay',
  seqReplay: 'sequence replay',
  histReal: 'historical real returns',
  fireAge: 'FIRE age',
  col: 'COL (cost of living)',
  bands: 'return bands',
  rothConversion: 'Roth conversion',
  rmd: 'an RMD (required minimum distribution)',
  brackets: 'tax brackets',
  guardrails: 'guardrails',
  sequenceRisk: 'sequence risk',
  lifeExpectancy: 'life expectancy',
  savingsRate: 'savings rate',
  ssClaim: 'Social Security claiming',
  healthcare: 'healthcare',
  cola: 'COLA',
  expenseDrag: 'expense drag',
  sensitivity: 'sensitivity',
  scenarios: 'scenarios',
  decumulation: 'decumulation',
  survivorBenefit: 'survivor benefit',
  dieWithZero: 'Die with Zero',
  todaysDollars: "today's dollars",
};

export const INFO_LABELS = GLOSSARY_LABELS;

// Terms whose polished label is plural — the InfoTip question uses "What are".
const PLURAL_TERMS = new Set<string>(['bands', 'brackets', 'guardrails', 'scenarios']);

export function isPluralTerm(term: string): boolean {
  return PLURAL_TERMS.has(term);
}

export function humanizeTerm(term: string): string {
  return term
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
}

const humanizeTermForLabel = humanizeTerm;

export function glossaryLabel(term: string): string {
  return GLOSSARY_LABELS[term] ?? humanizeTermForLabel(term);
}

// Aliases for compatibility with earlier naming.
export const displayLabel = glossaryLabel;
export const infoLabel = glossaryLabel;
export const getInfoLabel = glossaryLabel;
export const labelFor = glossaryLabel;
