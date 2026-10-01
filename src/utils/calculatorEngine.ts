import {
  RetirementState,
  YearlyProjection,
  SimulationResult,
  TimelineMilestone,
  TaxFilingStatus,
} from '../types/retirement';
import { resolveLocation } from '../data/cityLocations';
import { HISTORICAL_PRESETS, MONTE_CARLO_STATS } from '../data/historicalReturns';
import { FINANCIAL_CONSTANTS } from './constants';
import {
  ssClaimFactor,
  calcWithdrawalTaxes,
  estimateMcTax,
  rmdDivisor,
  RMD_START_AGE,
} from './taxEngine';

// Simple Mulberry32 seeded Pseudo-Random Number Generator for deterministic simulations
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple hash function for state object to create seed
function hashStateSeed(state: RetirementState): number {
  const str = JSON.stringify({
    a: state.currentAge,
    r: state.targetRetirementAge,
    l: state.lifeExpectancy,
    c: state.liquidCash,
    i: state.currentAnnualIncome,
    s: state.stockPct,
    b: state.bondPct,
    m: state.returnMode,
    t: state.targetLocationId,
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 123456789;
}

// Box-Muller transform for standard normal random numbers using PRNG
function randomNormal(mean: number, stdev: number, prng: () => number): number {
  let u1 = 0,
    u2 = 0;
  while (u1 === 0) u1 = prng();
  while (u2 === 0) u2 = prng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdev;
}

function getBaseMonthlyLifestyle(state: RetirementState): number {
  const { lifestyleTier, essentialExpensesMonthly, discretionaryExpensesMonthly, customCategories } = state;
  if (lifestyleTier === 'minimalist')
    return essentialExpensesMonthly * FINANCIAL_CONSTANTS.LIFESTYLE_MULTIPLIERS.minimalist;
  if (lifestyleTier === 'luxury')
    return (essentialExpensesMonthly + discretionaryExpensesMonthly) * FINANCIAL_CONSTANTS.LIFESTYLE_MULTIPLIERS.luxury;
  if (lifestyleTier === 'custom') {
    const customSum = customCategories.reduce((acc, cat) => acc + cat.monthlyAmount, 0);
    return essentialExpensesMonthly + customSum;
  }
  return essentialExpensesMonthly + discretionaryExpensesMonthly;
}

function calcChildEducationForYear(
  state: RetirementState,
  yearIndex: number,
  cumulativeInflation: number
): number {
  if (!state.hasChildren || state.children.length === 0) return 0;
  let total = 0;
  for (const child of state.children) {
    const childAge = child.currentAge + yearIndex;
    if (childAge >= 5 && childAge < 18 && child.schoolType === 'private_k12') {
      total += child.privateAnnualCost * cumulativeInflation;
    }
    if (childAge >= 18 && childAge < 18 + child.collegeYears && child.collegeTier !== 'none') {
      total += child.collegeAnnualCost * cumulativeInflation;
    }
  }
  return total;
}

/** Age-graded healthcare cost for the year (0 before the start age). */
function calcHealthcareForYear(
  state: RetirementState,
  primaryAge: number,
  healthColMultiplier: number
): number {
  const base = state.healthcareMonthlyAt65 ?? 0;
  if (base <= 0) return 0;
  const startAge = state.healthcareStartAge ?? 65;
  if (primaryAge < startAge) return 0;
  const medInfl = (state.healthcareInflationPct ?? 5.5) / 100;
  return base * 12 * Math.pow(1 + medInfl, primaryAge - startAge) * healthColMultiplier;
}

/** Amortized mortgage payment split using the user-provided interest rate. */
function applyMortgageYear(
  balance: number,
  monthlyPayment: number,
  annualRatePct: number
): { payment: number; newBalance: number } {
  if (balance <= 0 || monthlyPayment <= 0) return { payment: 0, newBalance: Math.max(0, balance) };
  const monthlyRate = annualRatePct / 100 / 12;
  let bal = balance;
  let paid = 0;
  for (let m = 0; m < 12; m++) {
    if (bal <= 0) break;
    const interest = bal * monthlyRate;
    if (monthlyPayment <= interest) {
      // Payment doesn't cover interest: balance grows, still pay full amount.
      bal += interest - monthlyPayment;
      paid += monthlyPayment;
    } else {
      const principal = Math.min(bal, monthlyPayment - interest);
      bal -= principal;
      paid += principal + interest;
    }
  }
  return { payment: paid, newBalance: Math.max(0, bal) };
}

export interface SimulationOptions {
  /** Monte Carlo trials (default 500). Lower for fast what-if sweeps. */
  trials?: number;
}

export function runRetirementSimulation(
  state: RetirementState,
  opts?: SimulationOptions
): SimulationResult {
  const {
    currentAge,
    targetRetirementAge,
    lifeExpectancy,
    liquidCash,
    taxableInvestments,
    preTax401k,
    postTaxRothHsa,
    debts,
    currentAnnualIncome,
    realIncomeGrowthMode,
    customIncomeGrowthRate,
    savingsRatePct,
    useFixedContribution,
    fixedAnnualContribution,
    contributionSplit,
    inflationMode,
    customInflationRate,
    historicalInflationPreset,
    stockPct,
    bondPct,
    cashPct,
    returnMode,
    customStockReturn,
    customBondReturn,
    hasChildren,
    children,
    housingType,
    rentMonthly,
    rentInflationPct,
    mortgageBalance,
    mortgageMonthly,
    mortgageInterestRate,
    mortgageRemainingYears,
    socialSecurityMonthlyAt67,
    socialSecurityStartAge,
    pensionMonthly,
    pensionStartAge,
  } = state;

  // --- Household setup (partner support) ---
  const partnerOn = state.hasPartner && state.partner.enabled;
  const partner = state.partner;
  // Joint filing when modeling a household (documented simplification).
  const filing: TaxFilingStatus = partnerOn ? 'joint' : state.taxFilingStatus;
  const horizonEndAge = partnerOn
    ? Math.max(lifeExpectancy, partner.lifeExpectancy)
    : lifeExpectancy;

  // Resolve Cost of Living Multiplier (with user percentile adjustment).
  // stateTaxPct from the location is now actually applied to ordinary income.
  const location = resolveLocation(state.targetLocationId);
  const baseColMultiplier = location.colIndex / 100.0;
  const colMultiplier = baseColMultiplier * (1 + (state.colAdjustmentPct || 0) / 100);
  const healthColMultiplier = (location.healthcareIndex ?? 100) / 100.0;
  const stateTaxPct = location.stateTaxPct ?? 0;

  // Resolve Real Income Growth Rate
  let incomeGrowthRate = 0.02;
  if (realIncomeGrowthMode === 'aggressive_5') incomeGrowthRate = 0.05;
  if (realIncomeGrowthMode === 'custom') incomeGrowthRate = customIncomeGrowthRate / 100.0;

  // Resolve Inflation Rate
  let baseInflation = 0.03;
  if (inflationMode === 'custom') baseInflation = customInflationRate / 100.0;

  // Normalize allocation weights so a 90/5/0 input doesn't silently drop 5%.
  const allocSum = Math.max(1e-9, stockPct + bondPct + cashPct);
  const stockW = stockPct / allocSum;
  const bondW = bondPct / allocSum;
  const cashW = cashPct / allocSum;

  // Base Expected Nominal Asset Returns
  const stockReturnNominal = (customStockReturn || 9.8) / 100.0;
  const bondReturnNominal = (customBondReturn || 4.8) / 100.0;
  const cashReturnNominal = FINANCIAL_CONSTANTS.DEFAULT_CASH_RETURN_NOMINAL;

  const expectedPortfolioReturn =
    stockW * stockReturnNominal + bondW * bondReturnNominal + cashW * cashReturnNominal;

  const baseMonthlyLifestyle = getBaseMonthlyLifestyle(state);
  const ssFactor = ssClaimFactor(socialSecurityStartAge);
  const partnerSsFactor = partnerOn ? ssClaimFactor(partner.ssStartAge) : 1;

  const withdrawalStrategy = state.withdrawalStrategy ?? 'fixed_order';
  const guardrailCut = (state.guardrailCutPct ?? 15) / 100;
  const rothOn = !!state.useRothConversions;
  const rothAnnual = state.rothConversionAnnual ?? 0;
  const rothStart = state.rothConversionStartAge ?? 60;
  const rothEnd = state.rothConversionEndAge ?? 70;

  const numYears = Math.max(1, horizonEndAge - currentAge + 1);

  /** Household Social Security for the year, with survivor benefit (max of the two). */
  const householdSsAnnual = (
    primaryAge: number,
    partnerAge: number,
    cumInflation: number
  ): number => {
    const primaryAlive = primaryAge <= lifeExpectancy;
    const partnerAlive = !partnerOn || partnerAge <= partner.lifeExpectancy;
    let primarySs = 0;
    if (primaryAlive && primaryAge >= socialSecurityStartAge && socialSecurityMonthlyAt67 > 0) {
      primarySs = socialSecurityMonthlyAt67 * 12 * ssFactor * cumInflation;
    }
    let partnerSs = 0;
    if (partnerOn && partnerAlive && partnerAge >= partner.ssStartAge && partner.ssMonthlyAt67 > 0) {
      partnerSs = partner.ssMonthlyAt67 * 12 * partnerSsFactor * cumInflation;
    }
    if (primaryAlive && partnerAlive) return primarySs + partnerSs;
    // Survivor keeps the larger check.
    return Math.max(primarySs, partnerSs);
  };

  // Trackers for lifetime reporting.
  let lifetimeTaxesPaid = 0;
  let lifetimeRothConverted = 0;

  // Helper to run a single deterministic / sequence trajectory
  const runSingleTrajectory = (
    returnModifier: number = 0,
    inflationModifier: number = 0,
    sequencePresetKey?: string
  ): YearlyProjection[] => {
    const projections: YearlyProjection[] = [];

    let currentLiquid = liquidCash;
    let currentTaxable = taxableInvestments;
    let currentPreTax = preTax401k;
    let currentPostTax = postTaxRothHsa;
    let currentIncome = currentAnnualIncome;
    let currentPartnerIncome = partnerOn ? partner.annualIncome : 0;
    let currentMortgageBal = housingType === 'mortgage' ? mortgageBalance : 0;
    let remainingMortgageYrs = housingType === 'mortgage' ? mortgageRemainingYears : 0;

    let otherDebtBal = debts.reduce((acc, d) => acc + d.balance, 0);
    const otherDebtMonthly = debts.reduce((acc, d) => acc + d.monthlyPayment, 0);

    const presetData = sequencePresetKey
      ? HISTORICAL_PRESETS.find((p) => p.id === sequencePresetKey)?.data
      : undefined;

    // Cumulative inflation factor for correct compounding under variable inflation.
    let cumulativeInflation = 1;
    // Year-end portfolio history for guardrails (decline detection).
    let prevYearEnd = liquidCash + taxableInvestments + preTax401k + postTaxRothHsa;
    let prevPrevYearEnd = prevYearEnd;

    for (let i = 0; i < numYears; i++) {
      const age = currentAge + i;
      const partnerAge = (partner.currentAge || currentAge) + i;
      const year = new Date().getFullYear() + i;
      const isRetired = age >= targetRetirementAge;

      // Determine year return & inflation
      let yearInflation = baseInflation + inflationModifier;
      let yearPortfolioReturn = expectedPortfolioReturn + returnModifier;

      if (presetData && presetData.length > 0) {
        const pYear = presetData[i % presetData.length];
        yearInflation = pYear.inflation / 100.0;
        const sRet = pYear.stock / 100.0;
        const bRet = pYear.bond / 100.0;
        yearPortfolioReturn = stockW * sRet + bondW * bRet + cashW * 0.02;
      }

      if (returnMode === 'deterministic') {
        // Deterministic mode uses expected returns exactly (modifiers still apply for bands).
      }

      // Milestones for this year
      const milestones: TimelineMilestone[] = [];

      if (age === targetRetirementAge) {
        milestones.push({
          age,
          year,
          title: '🏝️ Target Retirement Year',
          description: `Switching to decumulation mode in ${location.name}.`,
          icon: 'Palmtree',
          category: 'retirement',
        });
      }

      if (age === socialSecurityStartAge && socialSecurityMonthlyAt67 > 0) {
        milestones.push({
          age,
          year,
          title: '👵 Social Security Claimed',
          description: `Guaranteed monthly income boost of $${Math.round(socialSecurityMonthlyAt67).toLocaleString()}.`,
          icon: 'Landmark',
          category: 'income',
        });
      }

      if (rothOn && age === rothStart && rothAnnual > 0) {
        milestones.push({
          age,
          year,
          title: '🔄 Roth Conversions Begin',
          description: `Moving $${Math.round(rothAnnual).toLocaleString()}/yr pre-tax → Roth through age ${rothEnd}.`,
          icon: 'Calendar',
          category: 'income',
        });
      }

      if (age === RMD_START_AGE && currentPreTax > 0) {
        milestones.push({
          age,
          year,
          title: '📋 RMDs Begin',
          description: 'IRS required minimum distributions from pre-tax accounts start.',
          icon: 'Calendar',
          category: 'income',
        });
      }

      // Housing cost with amortized mortgage math.
      let annualHousingExpense = 0;
      if (housingType === 'mortgage') {
        if (remainingMortgageYrs > 0 && currentMortgageBal > 0) {
          const { payment, newBalance } = applyMortgageYear(
            currentMortgageBal,
            mortgageMonthly,
            mortgageInterestRate
          );
          annualHousingExpense = payment;
          currentMortgageBal = newBalance;
          remainingMortgageYrs -= 1;
          if (remainingMortgageYrs === 0 || currentMortgageBal <= 0) {
            currentMortgageBal = 0;
            milestones.push({
              age: age + 1,
              year: year + 1,
              title: '🏡 Mortgage Paid Off!',
              description: `Monthly housing payment drops to $0, freeing cash flow.`,
              icon: 'Home',
              category: 'housing',
            });
          }
        }
      } else {
        const rentEscalation = Math.pow(1 + rentInflationPct / 100, i);
        annualHousingExpense = rentMonthly * 12 * rentEscalation;
      }

      // Other debt paydown
      let annualDebtExpense = 0;
      if (otherDebtBal > 0) {
        annualDebtExpense = Math.min(otherDebtBal, otherDebtMonthly * 12);
        otherDebtBal = Math.max(0, otherDebtBal - annualDebtExpense);
      }

      // Education expenses + milestones (uses cumulative inflation).
      const childEdExpenses = calcChildEducationForYear(state, i, cumulativeInflation);
      if (hasChildren && children.length > 0) {
        children.forEach((child, index) => {
          const childAge = child.currentAge + i;
          if (childAge === 18 && child.collegeTier !== 'none') {
            milestones.push({
              age,
              year,
              title: `🎓 ${child.name || `Child ${index + 1}`} College Starts`,
              description: `Beginning ${child.collegeTier === 'in_state' ? 'Public In-State' : 'Private'} University degree.`,
              icon: 'GraduationCap',
              category: 'education',
            });
          }
        });
      }

      // Healthcare (age-graded, medical inflation, location-weighted).
      const healthExpenses = calcHealthcareForYear(state, age, healthColMultiplier);

      // Living expenses, with guardrails cut when active.
      let spendingCutApplied = false;
      let annualLivingExpenses = baseMonthlyLifestyle * 12 * cumulativeInflation;
      if (
        withdrawalStrategy === 'guardrails' &&
        isRetired &&
        i > 1 &&
        prevYearEnd < prevPrevYearEnd &&
        guardrailCut > 0
      ) {
        annualLivingExpenses *= 1 - guardrailCut;
        spendingCutApplied = true;
      }
      if (isRetired) {
        annualLivingExpenses *= colMultiplier; // Apply location COL multiplier in retirement
      }

      const totalAnnualOutflow =
        annualLivingExpenses + annualHousingExpense + childEdExpenses + annualDebtExpense + healthExpenses;

      // Guaranteed income (SS with survivor benefit + pension).
      const ssAnnual = householdSsAnnual(age, partnerAge, cumulativeInflation);
      let annualGuaranteedIncome = ssAnnual;
      if (age >= pensionStartAge && pensionMonthly > 0) {
        annualGuaranteedIncome += pensionMonthly * 12 * cumulativeInflation;
      }
      const pensionAnnual = age >= pensionStartAge && pensionMonthly > 0 ? pensionMonthly * 12 * cumulativeInflation : 0;

      let totalContrib = 0;
      let netWithdrawal = 0;
      let yearTaxPaid = 0;
      let yearRothConverted = 0;

      // Helper: draw an amount from liquid then taxable (for settling taxes).
      const drawTaxCash = (amount: number): number => {
        let need = Math.max(0, amount);
        if (need > 0 && currentLiquid > 0) {
          const d = Math.min(currentLiquid, need);
          currentLiquid -= d;
          need -= d;
        }
        if (need > 0 && currentTaxable > 0) {
          const d = Math.min(currentTaxable, need);
          currentTaxable -= d;
          need -= d;
        }
        return Math.max(0, amount) - need; // actually paid
      };

      if (!isRetired) {
        // Accumulation phase (household income when partnered).
        if (i > 0) {
          currentIncome *= 1 + incomeGrowthRate;
          if (partnerOn) currentPartnerIncome *= 1 + incomeGrowthRate;
        }
        const householdIncome = currentIncome + currentPartnerIncome;
        totalContrib = useFixedContribution
          ? fixedAnnualContribution
          : householdIncome * (savingsRatePct / 100.0);

        const splitSum = Math.max(
          1e-9,
          contributionSplit.preTaxPct + contributionSplit.postTaxPct + contributionSplit.taxablePct
        );
        currentPreTax += totalContrib * (contributionSplit.preTaxPct / splitSum);
        currentPostTax += totalContrib * (contributionSplit.postTaxPct / splitSum);
        currentTaxable += totalContrib * (contributionSplit.taxablePct / splitSum);
      }

      // Roth conversions (any phase, within the chosen window).
      let conversionTaxBase = 0;
      if (rothOn && rothAnnual > 0 && age >= rothStart && age <= rothEnd && currentPreTax > 0) {
        yearRothConverted = Math.min(currentPreTax, rothAnnual);
        currentPreTax -= yearRothConverted;
        currentPostTax += yearRothConverted;
        conversionTaxBase = yearRothConverted;
      }

      if (isRetired) {
        // Decumulation phase
        netWithdrawal = Math.max(0, totalAnnualOutflow - annualGuaranteedIncome);
        let remainingToWithdraw = netWithdrawal;
        let preTaxDraw = 0;
        let taxableDraw = 0;

        const drawCashFirst = () => {
          if (remainingToWithdraw > 0 && currentLiquid > 0) {
            const draw = Math.min(currentLiquid, remainingToWithdraw);
            currentLiquid -= draw;
            remainingToWithdraw -= draw;
          }
        };

        if (withdrawalStrategy === 'proportional') {
          drawCashFirst();
          const balTaxable = Math.max(0, currentTaxable);
          const balPreTax = Math.max(0, currentPreTax);
          const balPost = Math.max(0, currentPostTax);
          const balSum = Math.max(1e-9, balTaxable + balPreTax + balPost);
          if (remainingToWithdraw > 0 && balSum > 0) {
            const tDraw = Math.min(balTaxable, (remainingToWithdraw * balTaxable) / balSum);
            currentTaxable -= tDraw;
            taxableDraw += tDraw;
            remainingToWithdraw -= tDraw;
            const rDraw = Math.min(balPost, (remainingToWithdraw * balPost) / balSum);
            currentPostTax -= rDraw;
            remainingToWithdraw -= rDraw;
            const pShare = (remainingToWithdraw * balPreTax) / balSum;
            const grossed = pShare * FINANCIAL_CONSTANTS.PRE_TAX_WITHDRAWAL_GROSS_UP;
            const pDraw = Math.min(balPreTax, grossed);
            currentPreTax -= pDraw;
            preTaxDraw += pDraw;
            remainingToWithdraw -= pDraw / FINANCIAL_CONSTANTS.PRE_TAX_WITHDRAWAL_GROSS_UP;
          }
        } else {
          // fixed_order and guardrails share the tax-efficient order.
          drawCashFirst();
          // 2. Draw from Taxable
          if (remainingToWithdraw > 0 && currentTaxable > 0) {
            const draw = Math.min(currentTaxable, remainingToWithdraw);
            currentTaxable -= draw;
            taxableDraw += draw;
            remainingToWithdraw -= draw;
          }
          // 3. Draw from Pre-Tax (grossed up for income tax)
          if (remainingToWithdraw > 0 && currentPreTax > 0) {
            const grossedDraw = remainingToWithdraw * FINANCIAL_CONSTANTS.PRE_TAX_WITHDRAWAL_GROSS_UP;
            const draw = Math.min(currentPreTax, grossedDraw);
            currentPreTax -= draw;
            preTaxDraw += draw;
            remainingToWithdraw -= draw / FINANCIAL_CONSTANTS.PRE_TAX_WITHDRAWAL_GROSS_UP;
          }
          // 4. Draw from Post-Tax (Roth/HSA - tax-free)
          if (remainingToWithdraw > 0 && currentPostTax > 0) {
            const draw = Math.min(currentPostTax, remainingToWithdraw);
            currentPostTax -= draw;
            remainingToWithdraw -= draw;
          }
        }

        // RMDs: force pre-tax withdrawals from 75 (excess over need lands in taxable).
        if (age >= RMD_START_AGE && currentPreTax > 0) {
          const rmd = currentPreTax / rmdDivisor(age);
          if (preTaxDraw < rmd) {
            const extra = Math.min(currentPreTax, rmd - preTaxDraw);
            currentPreTax -= extra;
            preTaxDraw += extra;
            currentTaxable += extra; // unneeded RMD cash parks in taxable
            remainingToWithdraw = Math.max(0, remainingToWithdraw - extra);
          }
        }

        // Real tax bill on this year's draws + conversions, settled from cash/taxable.
        if (preTaxDraw > 0 || taxableDraw > 0 || conversionTaxBase > 0) {
          const bill = calcWithdrawalTaxes({
            preTaxDraw: preTaxDraw + conversionTaxBase,
            taxableDraw,
            pensionAnnual,
            ssAnnual,
            filing,
            stateTaxPct,
          });
          yearTaxPaid = drawTaxCash(bill.total);
        }
      } else if (conversionTaxBase > 0) {
        // Conversions during working years: tax the conversion alone.
        const bill = calcWithdrawalTaxes({
          preTaxDraw: conversionTaxBase,
          taxableDraw: 0,
          pensionAnnual: 0,
          ssAnnual: 0,
          filing,
          stateTaxPct,
        });
        yearTaxPaid = drawTaxCash(bill.total);
      }

      // Apply portfolio growth for the year
      currentLiquid *= 1 + cashReturnNominal;
      currentTaxable = Math.max(0, currentTaxable * (1 + yearPortfolioReturn));
      currentPreTax = Math.max(0, currentPreTax * (1 + yearPortfolioReturn));
      currentPostTax = Math.max(0, currentPostTax * (1 + yearPortfolioReturn));

      const totalPortfolio = currentLiquid + currentTaxable + currentPreTax + currentPostTax;
      const netWorth = totalPortfolio - currentMortgageBal - otherDebtBal;
      prevPrevYearEnd = prevYearEnd;
      prevYearEnd = totalPortfolio;

      projections.push({
        year,
        age,
        isRetired,
        netWorth50: Math.round(netWorth),
        netWorth95: Math.round(netWorth),
        netWorth10: Math.round(netWorth),
        liquidCash: Math.round(currentLiquid),
        taxableInvestments: Math.round(currentTaxable),
        preTaxAccount: Math.round(currentPreTax),
        postTaxAccount: Math.round(currentPostTax),
        totalDebtBalance: Math.round(currentMortgageBal + otherDebtBal),
        totalPortfolio: Math.round(totalPortfolio),
        grossIncome: Math.round(isRetired ? annualGuaranteedIncome : currentIncome + currentPartnerIncome),
        totalContributions: Math.round(totalContrib),
        livingExpenses: Math.round(annualLivingExpenses),
        housingExpenses: Math.round(annualHousingExpense),
        childEducationExpenses: Math.round(childEdExpenses),
        healthcareExpenses: Math.round(healthExpenses),
        debtPayments: Math.round(annualDebtExpense),
        totalExpenses: Math.round(totalAnnualOutflow),
        guaranteedRetirementIncome: Math.round(annualGuaranteedIncome),
        netWithdrawalNeeded: Math.round(netWithdrawal),
        taxPaid: Math.round(yearTaxPaid),
        rothConverted: Math.round(yearRothConverted),
        spendingCutApplied,
        milestones,
      });

      // Advance cumulative inflation for next year.
      cumulativeInflation *= 1 + yearInflation;
    }

    return projections;
  };

  // Run Target Case
  const targetProjections = runSingleTrajectory(
    0,
    0,
    inflationMode === 'historical_replay' ? historicalInflationPreset : undefined
  );

  // Lifetime totals come from the target run only (band runs share the
  // same accumulators, so recompute here instead of summing all three).
  const targetTaxes = targetProjections.reduce((a, p) => a + p.taxPaid, 0);
  const targetRoth = targetProjections.reduce((a, p) => a + p.rothConverted, 0);
  lifetimeTaxesPaid = targetTaxes;
  lifetimeRothConverted = targetRoth;

  // Scenario bands (labeled Conservative / Stress — deterministic offsets, not statistical percentiles).
  const conservativeProjections = runSingleTrajectory(0.02, -0.005);
  const stressProjections = runSingleTrajectory(-0.025, 0.015);

  // Merge scenario bands into target projections. Net worth consistently nets out debt.
  const mergedProjections: YearlyProjection[] = targetProjections.map((p, idx) => {
    const conservativeNet =
      conservativeProjections[idx] != null
        ? conservativeProjections[idx].totalPortfolio - conservativeProjections[idx].totalDebtBalance
        : p.totalPortfolio * 1.25;
    const stressNet =
      stressProjections[idx] != null
        ? stressProjections[idx].totalPortfolio - stressProjections[idx].totalDebtBalance
        : p.totalPortfolio * 0.65;
    return {
      ...p,
      netWorth50: Math.round(p.totalPortfolio - p.totalDebtBalance),
      netWorth95: Math.round(conservativeNet),
      netWorth10: Math.round(Math.max(0, stressNet)),
    };
  });

  // Calculate Success Rate via Monte Carlo Simulation (shares outflow logic with main trajectory).
  let successfulTrials = 0;
  const totalTrials = opts?.trials ?? FINANCIAL_CONSTANTS.MONTE_CARLO_TRIALS;
  const prng = createPRNG(hashStateSeed(state));

  for (let trial = 0; trial < totalTrials; trial++) {
    let simPortfolio = liquidCash + taxableInvestments + preTax401k + postTaxRothHsa;
    let simIncome = currentAnnualIncome;
    let simPartnerIncome = partnerOn ? partner.annualIncome : 0;
    let simMortgageBal = housingType === 'mortgage' ? mortgageBalance : 0;
    let simMortgageYrs = housingType === 'mortgage' ? mortgageRemainingYears : 0;
    let simOtherDebt = debts.reduce((acc, d) => acc + d.balance, 0);
    const simOtherMonthly = debts.reduce((acc, d) => acc + d.monthlyPayment, 0);
    let simCumInflation = 1;
    let simFailed = false;
    let simPrevEnd = simPortfolio;
    let simPrevPrevEnd = simPortfolio;

    for (let i = 0; i < numYears; i++) {
      const age = currentAge + i;
      const partnerAge = (partner.currentAge || currentAge) + i;
      const isRetired = age >= targetRetirementAge;

      // Sample random market return and inflation for trial year using seeded PRNG
      const sampledStock = randomNormal(MONTE_CARLO_STATS.stock.mean, MONTE_CARLO_STATS.stock.stdev, prng);
      const sampledBond = randomNormal(MONTE_CARLO_STATS.bond.mean, MONTE_CARLO_STATS.bond.stdev, prng);
      const sampledInflation = Math.max(
        0.005,
        randomNormal(MONTE_CARLO_STATS.inflation.mean, MONTE_CARLO_STATS.inflation.stdev, prng)
      );

      const trialPortfolioReturn = stockW * sampledStock + bondW * sampledBond + cashW * 0.025;

      // Expenses (same structure as deterministic trajectory)
      let annualLiving = baseMonthlyLifestyle * 12 * simCumInflation;
      if (
        withdrawalStrategy === 'guardrails' &&
        isRetired &&
        i > 1 &&
        simPrevEnd < simPrevPrevEnd &&
        guardrailCut > 0
      ) {
        annualLiving *= 1 - guardrailCut;
      }
      if (isRetired) annualLiving *= colMultiplier;

      let annualHousing = 0;
      if (housingType === 'rent') {
        annualHousing = rentMonthly * 12 * Math.pow(1 + rentInflationPct / 100, i);
      } else if (simMortgageYrs > 0 && simMortgageBal > 0) {
        const { payment, newBalance } = applyMortgageYear(simMortgageBal, mortgageMonthly, mortgageInterestRate);
        annualHousing = payment;
        simMortgageBal = newBalance;
        simMortgageYrs -= 1;
      }

      let annualDebt = 0;
      if (simOtherDebt > 0) {
        annualDebt = Math.min(simOtherDebt, simOtherMonthly * 12);
        simOtherDebt = Math.max(0, simOtherDebt - annualDebt);
      }

      const childEdu = calcChildEducationForYear(state, i, simCumInflation);
      const healthTrial =
        (state.healthcareMonthlyAt65 ?? 0) > 0 && age >= (state.healthcareStartAge ?? 65)
          ? (state.healthcareMonthlyAt65 ?? 0) *
            12 *
            Math.pow(1 + (state.healthcareInflationPct ?? 5.5) / 100, age - (state.healthcareStartAge ?? 65)) *
            healthColMultiplier
          : 0;
      const trialOutflow = annualLiving + annualHousing + childEdu + annualDebt + healthTrial;

      if (!isRetired) {
        if (i > 0) {
          simIncome *= 1 + incomeGrowthRate;
          if (partnerOn) simPartnerIncome *= 1 + incomeGrowthRate;
        }
        const householdSimIncome = simIncome + simPartnerIncome;
        const contrib = useFixedContribution
          ? fixedAnnualContribution
          : householdSimIncome * (savingsRatePct / 100.0);
        simPortfolio += contrib;
      } else {
        // Household SS with survivor benefit (same helper as deterministic).
        const primaryAlive = age <= lifeExpectancy;
        const partnerAlive = !partnerOn || partnerAge <= partner.lifeExpectancy;
        let trialSs = 0;
        if (primaryAlive && age >= socialSecurityStartAge && socialSecurityMonthlyAt67 > 0) {
          trialSs = socialSecurityMonthlyAt67 * 12 * ssFactor * simCumInflation;
        }
        if (partnerOn && partnerAlive && partnerAge >= partner.ssStartAge && partner.ssMonthlyAt67 > 0) {
          const pSs = partner.ssMonthlyAt67 * 12 * partnerSsFactor * simCumInflation;
          trialSs = primaryAlive && partnerAlive ? trialSs + pSs : Math.max(trialSs, pSs);
        }
        let trialGuaranteed = trialSs;
        if (age >= pensionStartAge) trialGuaranteed += pensionMonthly * 12 * simCumInflation;

        const needed = Math.max(0, trialOutflow - trialGuaranteed);
        const tax = estimateMcTax(needed, filing, stateTaxPct);
        simPortfolio -= needed + tax;
      }

      simPortfolio *= 1 + trialPortfolioReturn;
      simCumInflation *= 1 + sampledInflation;
      simPrevPrevEnd = simPrevEnd;
      simPrevEnd = simPortfolio;

      if (simPortfolio < 0 && isRetired) {
        simFailed = true;
        break;
      }
    }

    if (!simFailed) successfulTrials++;
  }

  const successRate = Math.round((successfulTrials / totalTrials) * 100);

  // Key KPI metrics
  const retirementYearProj = mergedProjections.find((p) => p.age === targetRetirementAge);
  const finalYearProj = mergedProjections[mergedProjections.length - 1];

  const targetRetirementNetWorth = retirementYearProj
    ? retirementYearProj.totalPortfolio - retirementYearProj.totalDebtBalance
    : 0;
  const finalNetWorth = finalYearProj ? finalYearProj.netWorth50 : 0;

  // Estimate retirement-year spend including housing + healthcare so FIRE/SWR aren't understated.
  const yearsToRetirement = Math.max(0, targetRetirementAge - currentAge);
  const rentAtRetirement =
    housingType === 'rent' ? rentMonthly * 12 * Math.pow(1 + rentInflationPct / 100, yearsToRetirement) : 0;
  const mortgageAtRetirement =
    housingType === 'mortgage' && yearsToRetirement < mortgageRemainingYears ? mortgageMonthly * 12 : 0;
  const healthBase = state.healthcareMonthlyAt65 ?? 0;
  const healthAtRetirement =
    healthBase > 0 && targetRetirementAge >= (state.healthcareStartAge ?? 65)
      ? healthBase * 12 * Math.pow(1 + (state.healthcareInflationPct ?? 5.5) / 100, targetRetirementAge - (state.healthcareStartAge ?? 65)) * healthColMultiplier
      : 0;
  const estimatedRetirementAnnualExpense =
    baseMonthlyLifestyle * 12 * colMultiplier + rentAtRetirement + mortgageAtRetirement + healthAtRetirement;
  const targetFireNumber = estimatedRetirementAnnualExpense * FINANCIAL_CONSTANTS.FIRE_MULTIPLE;

  // Find early FIRE age if portfolio hits 25x annual retirement expenses
  let fireAgeAchievable: number | null = null;

  const fireProj = mergedProjections.find(
    (p) => p.totalPortfolio - p.totalDebtBalance >= targetFireNumber && p.age < targetRetirementAge
  );
  if (fireProj) {
    fireAgeAchievable = fireProj.age;
  }

  // Safe Withdrawal Rate
  const safeWithdrawalRatePct =
    targetRetirementNetWorth > 0
      ? Math.round((estimatedRetirementAnnualExpense / targetRetirementNetWorth) * 10000) / 100
      : 4.0;

  return {
    yearlyProjections: mergedProjections,
    successRate,
    targetRetirementNetWorth: Math.round(targetRetirementNetWorth),
    finalNetWorth: Math.round(finalNetWorth),
    fireAgeAchievable,
    safeWithdrawalRatePct,
    monthlyRetirementSpending: Math.round(baseMonthlyLifestyle * colMultiplier),
    baselineLocationName: 'US National Average',
    targetLocationName: location.name,
    colMultiplier,
    lifetimeTaxesPaid: Math.round(lifetimeTaxesPaid),
    lifetimeRothConverted: Math.round(lifetimeRothConverted),
  };
}
