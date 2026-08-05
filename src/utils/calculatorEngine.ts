import {
  RetirementState,
  YearlyProjection,
  SimulationResult,
  TimelineMilestone,
} from '../types/retirement';
import { LOCATION_PRESETS } from '../data/colData';
import { HISTORICAL_PRESETS, MONTE_CARLO_STATS } from '../data/historicalReturns';

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
    mortgageRemainingYears,
    lifestyleTier,
    essentialExpensesMonthly,
    discretionaryExpensesMonthly,
    customCategories,
    targetLocationId,
    socialSecurityMonthlyAt67,
    socialSecurityStartAge,
    pensionMonthly,
    pensionStartAge,
  } = state;

  // Resolve Cost of Living Multiplier
  const location = LOCATION_PRESETS.find((l) => l.id === targetLocationId) || LOCATION_PRESETS[0];
  const colMultiplier = location.colIndex / 100.0;

  // Resolve Real Income Growth Rate
  let incomeGrowthRate = 0.02;
  if (realIncomeGrowthMode === 'aggressive_5') incomeGrowthRate = 0.05;
  if (realIncomeGrowthMode === 'custom') incomeGrowthRate = customIncomeGrowthRate / 100.0;

  // Resolve Inflation Rate
  let baseInflation = 0.03;
  if (inflationMode === 'custom') baseInflation = customInflationRate / 100.0;

  // Base Expected Nominal Asset Returns
  const stockReturnNominal = (customStockReturn || 9.8) / 100.0;
  const bondReturnNominal = (customBondReturn || 4.8) / 100.0;
  const cashReturnNominal = 0.025;

  const expectedPortfolioReturn =
    (stockPct / 100) * stockReturnNominal +
    (bondPct / 100) * bondReturnNominal +
    (cashPct / 100) * cashReturnNominal;

  // Base Monthly Lifestyle Spending
  let baseMonthlyLifestyle = essentialExpensesMonthly + discretionaryExpensesMonthly;
  if (lifestyleTier === 'minimalist') baseMonthlyLifestyle = essentialExpensesMonthly * 0.8;
  if (lifestyleTier === 'luxury') baseMonthlyLifestyle = (essentialExpensesMonthly + discretionaryExpensesMonthly) * 1.6;
  if (lifestyleTier === 'custom') {
    const customSum = customCategories.reduce((acc, cat) => acc + cat.monthlyAmount, 0);
    baseMonthlyLifestyle = essentialExpensesMonthly + customSum;
  }

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
        yearPortfolioReturn = (stockPct / 100) * sRet + (bondPct / 100) * bRet + (cashPct / 100) * 0.02;
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

      // Mortgage Payoff check
      let annualHousingExpense = 0;
      if (housingType === 'mortgage') {
        if (remainingMortgageYrs > 0) {
          annualHousingExpense = mortgageMonthly * 12;
          currentMortgageBal = Math.max(0, currentMortgageBal - (mortgageMonthly * 12 * 0.6)); // approx principal paydown
          remainingMortgageYrs -= 1;
          if (remainingMortgageYrs === 0) {
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
        annualDebtExpense = otherDebtMonthly * 12;
        otherDebtBal = Math.max(0, otherDebtBal - annualDebtExpense * 0.8);
      }

      // Education expenses
      let childEdExpenses = 0;
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
          if (childAge >= 5 && childAge < 18 && child.schoolType === 'private_k12') {
            childEdExpenses += child.privateAnnualCost * Math.pow(1 + yearInflation, i);
          }
          if (childAge >= 18 && childAge < 18 + child.collegeYears && child.collegeTier !== 'none') {
            childEdExpenses += child.collegeAnnualCost * Math.pow(1 + yearInflation, i);
          }
        });
      }

      // Calculate Living Expenses
      let annualLivingExpenses = baseMonthlyLifestyle * 12 * Math.pow(1 + yearInflation, i);
      if (isRetired) {
        annualLivingExpenses *= colMultiplier; // Apply location COL multiplier in retirement
      }

      const totalAnnualOutflow = annualLivingExpenses + annualHousingExpense + childEdExpenses + annualDebtExpense;

      // Guaranteed Retirement Income (SS + Pension)
      let annualGuaranteedIncome = 0;
      if (age >= socialSecurityStartAge && socialSecurityMonthlyAt67 > 0) {
        // Adjust SS for early/late claim vs age 67
        let ssFactor = 1.0;
        if (socialSecurityStartAge < 67) ssFactor = 1.0 - (67 - socialSecurityStartAge) * 0.0667;
        if (socialSecurityStartAge > 67) ssFactor = 1.0 + Math.min(3, socialSecurityStartAge - 67) * 0.08;
        annualGuaranteedIncome += socialSecurityMonthlyAt67 * 12 * ssFactor * Math.pow(1 + yearInflation, i);
      }
      if (age >= pensionStartAge && pensionMonthly > 0) {
        annualGuaranteedIncome += pensionMonthly * 12 * Math.pow(1 + yearInflation, i);
      }

      let totalContrib = 0;
      let netWithdrawal = 0;

      if (!isRetired) {
        // Accumulation phase
        if (i > 0) currentIncome *= 1 + incomeGrowthRate;
        totalContrib = useFixedContribution
          ? fixedAnnualContribution
          : currentIncome * (savingsRatePct / 100.0);

        const preTaxAdd = totalContrib * (contributionSplit.preTaxPct / 100);
        const postTaxAdd = totalContrib * (contributionSplit.postTaxPct / 100);
        const taxableAdd = totalContrib * (contributionSplit.taxablePct / 100);

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
        // 3. Draw from Pre-Tax (401k/Traditional IRA - grossed up ~15% for income tax)
        if (remainingToWithdraw > 0 && currentPreTax > 0) {
          const grossedDraw = remainingToWithdraw * 1.15;
          const draw = Math.min(currentPreTax, grossedDraw);
          currentPreTax -= draw;
          remainingToWithdraw -= draw / 1.15;
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

      projections.push({
        year,
        age,
        isRetired,
        netWorth50: totalPortfolio - currentMortgageBal - otherDebtBal,
        netWorth95: totalPortfolio - currentMortgageBal - otherDebtBal,
        netWorth10: totalPortfolio - currentMortgageBal - otherDebtBal,
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
    }

    return projections;
  };

  // Run Target Case (50th percentile)
  const targetProjections = runSingleTrajectory(
    0,
    0,
    inflationMode === 'historical_replay' ? historicalInflationPreset : undefined
  );

  // Run Conservative Case (95th percentile / Upper Confidence)
  const conservativeProjections = runSingleTrajectory(0.02, -0.005);

  // Run Stress Test Case (10th percentile / Lower Confidence)
  const stressProjections = runSingleTrajectory(-0.025, 0.015);

  // Merge percentiles into target projections
  const mergedProjections: YearlyProjection[] = targetProjections.map((p, idx) => {
    return {
      ...p,
      netWorth50: Math.round(p.totalPortfolio),
      netWorth95: Math.round(conservativeProjections[idx]?.totalPortfolio || p.totalPortfolio * 1.25),
      netWorth10: Math.round(Math.max(0, stressProjections[idx]?.totalPortfolio || p.totalPortfolio * 0.65)),
    };
  });

  // Calculate Success Rate via Monte Carlo Simulation (500 trials)
  let successfulTrials = 0;
  const totalTrials = 500;
  const prng = createPRNG(hashStateSeed(state));

  for (let trial = 0; trial < totalTrials; trial++) {
    let simPortfolio = liquidCash + taxableInvestments + preTax401k + postTaxRothHsa;
    let simIncome = currentAnnualIncome;
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

      const trialPortfolioReturn =
        (stockPct / 100) * sampledStock +
        (bondPct / 100) * sampledBond +
        (cashPct / 100) * 0.025;

      // Expenses
      let annualLiving = baseMonthlyLifestyle * 12 * Math.pow(1 + sampledInflation, i);
      if (isRetired) annualLiving *= colMultiplier;

      let annualHousing = housingType === 'rent' ? rentMonthly * 12 * Math.pow(1 + rentInflationPct / 100, i) : 0;
      if (housingType === 'mortgage' && i < mortgageRemainingYears) {
        annualHousing = mortgageMonthly * 12;
      }

      const trialOutflow = annualLiving + annualHousing;

      if (!isRetired) {
        if (i > 0) simIncome *= 1 + incomeGrowthRate;
        const contrib = useFixedContribution
          ? fixedAnnualContribution
          : simIncome * (savingsRatePct / 100.0);
        simPortfolio += contrib;
      } else {
        let trialGuaranteed = 0;
        if (age >= socialSecurityStartAge) trialGuaranteed += socialSecurityMonthlyAt67 * 12;
        if (age >= pensionStartAge) trialGuaranteed += pensionMonthly * 12;

        const needed = Math.max(0, trialOutflow - trialGuaranteed);
        simPortfolio -= needed;
      }

      simPortfolio *= 1 + trialPortfolioReturn;

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

  const targetRetirementNetWorth = retirementYearProj ? retirementYearProj.totalPortfolio : 0;
  const finalNetWorthAge90 = finalYearProj ? finalYearProj.netWorth50 : 0;

  // Find early FIRE age if portfolio hits 25x annual retirement expenses
  let fireAgeAchievable: number | null = null;
  const estimatedRetirementAnnualExpense = baseMonthlyLifestyle * 12 * colMultiplier;
  const targetFireNumber = estimatedRetirementAnnualExpense * 25;

  const fireProj = mergedProjections.find(
    (p) => p.totalPortfolio >= targetFireNumber && p.age < targetRetirementAge
  );
  if (fireProj) {
    fireAgeAchievable = fireProj.age;
  }

  // Safe Withdrawal Rate
  const safeWithdrawalRatePct = targetRetirementNetWorth > 0
    ? Math.round(((estimatedRetirementAnnualExpense) / targetRetirementNetWorth) * 10000) / 100
    : 4.0;

  return {
    yearlyProjections: mergedProjections,
    successRate,
    targetRetirementNetWorth,
    finalNetWorthAge90,
    fireAgeAchievable,
    safeWithdrawalRatePct,
    monthlyRetirementSpending: Math.round(baseMonthlyLifestyle * colMultiplier),
    baselineLocationName: 'US National Average',
    targetLocationName: location.name,
    colMultiplier,
  };
}
