import {
  RetirementState,
  YearlyProjection,
  SimulationResult,
  TimelineMilestone,
} from '../types/retirement';
import { LOCATION_PRESETS } from '../data/colData';
import { HISTORICAL_PRESETS, MONTE_CARLO_STATS } from '../data/historicalReturns';
import { FINANCIAL_CONSTANTS } from './constants';

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
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 123456789;
}

// Box-Muller transform for standard normal random numbers using PRNG
function randomNormal(mean: number, stdev: number, prng: () => number): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = prng();
  while (u2 === 0) u2 = prng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdev;
}

function getSocialSecurityFactor(startAge: number): number {
  if (startAge < 67) return Math.max(0.7, 1.0 - (67 - startAge) * FINANCIAL_CONSTANTS.SS_EARLY_REDUCTION_PER_YEAR);
  if (startAge > 67)
    return 1.0 + Math.min(FINANCIAL_CONSTANTS.SS_LATE_BONUS_MAX_YEARS, startAge - 67) * FINANCIAL_CONSTANTS.SS_LATE_BONUS_PER_YEAR;
  return 1.0;
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

export function runRetirementSimulation(state: RetirementState): SimulationResult {
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

  // Resolve Cost of Living Multiplier (with user percentile adjustment)
  const location = LOCATION_PRESETS.find((l) => l.id === state.targetLocationId) || LOCATION_PRESETS[0];
  const baseColMultiplier = location.colIndex / 100.0;
  const colMultiplier = baseColMultiplier * (1 + (state.colAdjustmentPct || 0) / 100);

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
  const ssFactor = getSocialSecurityFactor(socialSecurityStartAge);

  const numYears = Math.max(1, lifeExpectancy - currentAge + 1);

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
    let currentMortgageBal = housingType === 'mortgage' ? mortgageBalance : 0;
    let remainingMortgageYrs = housingType === 'mortgage' ? mortgageRemainingYears : 0;

    let otherDebtBal = debts.reduce((acc, d) => acc + d.balance, 0);
    const otherDebtMonthly = debts.reduce((acc, d) => acc + d.monthlyPayment, 0);

    const presetData = sequencePresetKey
      ? HISTORICAL_PRESETS.find((p) => p.id === sequencePresetKey)?.data
      : undefined;

    // Cumulative inflation factor for correct compounding under variable inflation.
    let cumulativeInflation = 1;

    for (let i = 0; i < numYears; i++) {
      const age = currentAge + i;
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
        // Accrue roughly at 0% here (individual rates tracked per-debt in UI);
        // principal paydown approximates cash-flow drag.
        otherDebtBal = Math.max(0, otherDebtBal - annualDebtExpense);
      }

      // Education expenses + milestones (uses cumulative inflation).
      let childEdExpenses = calcChildEducationForYear(state, i, cumulativeInflation);
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

      // Calculate Living Expenses
      let annualLivingExpenses = baseMonthlyLifestyle * 12 * cumulativeInflation;
      if (isRetired) {
        annualLivingExpenses *= colMultiplier; // Apply location COL multiplier in retirement
      }

      const totalAnnualOutflow = annualLivingExpenses + annualHousingExpense + childEdExpenses + annualDebtExpense;

      // Guaranteed Retirement Income (SS + Pension)
      let annualGuaranteedIncome = 0;
      if (age >= socialSecurityStartAge && socialSecurityMonthlyAt67 > 0) {
        annualGuaranteedIncome += socialSecurityMonthlyAt67 * 12 * ssFactor * cumulativeInflation;
      }
      if (age >= pensionStartAge && pensionMonthly > 0) {
        annualGuaranteedIncome += pensionMonthly * 12 * cumulativeInflation;
      }

      let totalContrib = 0;
      let netWithdrawal = 0;

      if (!isRetired) {
        // Accumulation phase
        if (i > 0) currentIncome *= 1 + incomeGrowthRate;
        totalContrib = useFixedContribution
          ? fixedAnnualContribution
          : currentIncome * (savingsRatePct / 100.0);

        const splitSum = Math.max(
          1e-9,
          contributionSplit.preTaxPct + contributionSplit.postTaxPct + contributionSplit.taxablePct
        );
        const preTaxAdd = totalContrib * (contributionSplit.preTaxPct / splitSum);
        const postTaxAdd = totalContrib * (contributionSplit.postTaxPct / splitSum);
        const taxableAdd = totalContrib * (contributionSplit.taxablePct / splitSum);

        currentPreTax += preTaxAdd;
        currentPostTax += postTaxAdd;
        currentTaxable += taxableAdd;
      } else {
        // Decumulation phase
        netWithdrawal = Math.max(0, totalAnnualOutflow - annualGuaranteedIncome);
        let remainingToWithdraw = netWithdrawal;

        // 1. Draw from Liquid Cash
        if (remainingToWithdraw > 0 && currentLiquid > 0) {
          const draw = Math.min(currentLiquid, remainingToWithdraw);
          currentLiquid -= draw;
          remainingToWithdraw -= draw;
        }
        // 2. Draw from Taxable
        if (remainingToWithdraw > 0 && currentTaxable > 0) {
          const draw = Math.min(currentTaxable, remainingToWithdraw);
          currentTaxable -= draw;
          remainingToWithdraw -= draw;
        }
        // 3. Draw from Pre-Tax (401k/Traditional IRA - grossed up for income tax)
        if (remainingToWithdraw > 0 && currentPreTax > 0) {
          const grossedDraw = remainingToWithdraw * FINANCIAL_CONSTANTS.PRE_TAX_WITHDRAWAL_GROSS_UP;
          const draw = Math.min(currentPreTax, grossedDraw);
          currentPreTax -= draw;
          remainingToWithdraw -= draw / FINANCIAL_CONSTANTS.PRE_TAX_WITHDRAWAL_GROSS_UP;
        }
        // 4. Draw from Post-Tax (Roth/HSA - tax-free)
        if (remainingToWithdraw > 0 && currentPostTax > 0) {
          const draw = Math.min(currentPostTax, remainingToWithdraw);
          currentPostTax -= draw;
          remainingToWithdraw -= draw;
        }
      }

      // Apply portfolio growth for the year
      currentLiquid *= 1 + cashReturnNominal;
      currentTaxable = Math.max(0, currentTaxable * (1 + yearPortfolioReturn));
      currentPreTax = Math.max(0, currentPreTax * (1 + yearPortfolioReturn));
      currentPostTax = Math.max(0, currentPostTax * (1 + yearPortfolioReturn));

      const totalPortfolio = currentLiquid + currentTaxable + currentPreTax + currentPostTax;
      const netWorth = totalPortfolio - currentMortgageBal - otherDebtBal;

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
        grossIncome: Math.round(isRetired ? annualGuaranteedIncome : currentIncome),
        totalContributions: Math.round(totalContrib),
        livingExpenses: Math.round(annualLivingExpenses),
        housingExpenses: Math.round(annualHousingExpense),
        childEducationExpenses: Math.round(childEdExpenses),
        debtPayments: Math.round(annualDebtExpense),
        totalExpenses: Math.round(totalAnnualOutflow),
        guaranteedRetirementIncome: Math.round(annualGuaranteedIncome),
        netWithdrawalNeeded: Math.round(netWithdrawal),
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
  const totalTrials = FINANCIAL_CONSTANTS.MONTE_CARLO_TRIALS;
  const prng = createPRNG(hashStateSeed(state));

  for (let trial = 0; trial < totalTrials; trial++) {
    let simPortfolio = liquidCash + taxableInvestments + preTax401k + postTaxRothHsa;
    let simIncome = currentAnnualIncome;
    let simMortgageBal = housingType === 'mortgage' ? mortgageBalance : 0;
    let simMortgageYrs = housingType === 'mortgage' ? mortgageRemainingYears : 0;
    let simOtherDebt = debts.reduce((acc, d) => acc + d.balance, 0);
    const simOtherMonthly = debts.reduce((acc, d) => acc + d.monthlyPayment, 0);
    let simCumInflation = 1;
    let simFailed = false;

    for (let i = 0; i < numYears; i++) {
      const age = currentAge + i;
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
      const trialOutflow = annualLiving + annualHousing + childEdu + annualDebt;

      if (!isRetired) {
        if (i > 0) simIncome *= 1 + incomeGrowthRate;
        const contrib = useFixedContribution
          ? fixedAnnualContribution
          : simIncome * (savingsRatePct / 100.0);
        simPortfolio += contrib;
      } else {
        let trialGuaranteed = 0;
        if (age >= socialSecurityStartAge)
          trialGuaranteed += socialSecurityMonthlyAt67 * 12 * ssFactor * simCumInflation;
        if (age >= pensionStartAge) trialGuaranteed += pensionMonthly * 12 * simCumInflation;

        const needed = Math.max(0, trialOutflow - trialGuaranteed);
        simPortfolio -= needed;
      }

      simPortfolio *= 1 + trialPortfolioReturn;
      simCumInflation *= 1 + sampledInflation;

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

  // Estimate retirement-year spend including housing so FIRE/SWR aren't understated.
  const yearsToRetirement = Math.max(0, targetRetirementAge - currentAge);
  const rentAtRetirement =
    housingType === 'rent' ? rentMonthly * 12 * Math.pow(1 + rentInflationPct / 100, yearsToRetirement) : 0;
  const mortgageAtRetirement =
    housingType === 'mortgage' && yearsToRetirement < mortgageRemainingYears ? mortgageMonthly * 12 : 0;
  const estimatedRetirementAnnualExpense =
    baseMonthlyLifestyle * 12 * colMultiplier + rentAtRetirement + mortgageAtRetirement;
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
  };
}
