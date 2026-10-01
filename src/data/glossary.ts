// Plain-English definitions for financial jargon used across the app.
// Rendered via the InfoTip component.

export const GLOSSARY: Record<string, string> = {
  successRate:
    'Share of 500 simulated market futures where your money lasts to the end of the plan. 80%+ is generally considered safe.',
  monteCarlo:
    "A simulation that replays your plan 500 times with randomly sampled market returns and inflation, so a single lucky average can't hide risk.",
  swr: 'Safe Withdrawal Rate: the share of your retirement wealth your yearly spending represents. Near or below 4% is the classic comfort zone.',
  fireAge:
    'The age your invested assets first cover 25x your yearly retirement spending — the classic Financial Independence threshold.',
  col: 'Cost-of-Living multiplier. 1.00 = US average; 0.62 (Lisbon) means retirement spending stretches ~38% further.',
  bands:
    'Three deterministic paths: expected returns (Target), +2% returns (Conservative), and -2.5% returns with higher inflation (Stress Test). Not statistical percentiles.',
  rothConversion:
    'Moving money from pre-tax (401k/IRA) to Roth in low-income years. You pay income tax now so withdrawals later — including growth — are tax-free.',
  rmd: 'Required Minimum Distribution: from age 75 the IRS forces yearly pre-tax withdrawals (balance ÷ life-expectancy factor), taxed as income.',
  brackets:
    'The US taxes ordinary income in slices (10%-37% for 2025) after a standard deduction ($15k single / $30k joint). Only income inside each slice pays that slice\u2019s rate.',
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
};

export function glossary(term: string): string {
  return GLOSSARY[term] ?? term;
}
