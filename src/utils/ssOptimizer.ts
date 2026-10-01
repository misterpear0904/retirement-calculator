import { RetirementState } from '../types/retirement';
import { ssClaimFactor } from './taxEngine';

export interface ClaimRow {
  claimAge: number;
  monthlyBenefit: number;
  lifetimeTotal: number;
  isCurrent: boolean;
  isBest: boolean;
}

export interface HouseholdOptimum {
  primaryAge: number;
  spouseAge: number | null;
  householdLifetimeTotal: number;
}

/**
 * Deterministic Social Security claiming optimizer.
 * Compares nominal lifetime benefits (monthly check x years collected) for
 * claiming ages 62-70. COLA applies equally at every age so it doesn't change
 * the ranking; discounting is omitted and noted in the UI.
 * With a partner enabled, jointly optimizes both claiming ages including a
 * simplified spousal benefit (50% of the primary's age-67 benefit, reduced for
 * early spouse claims, no delayed credits — per SSA rules).
 */
export function primaryClaimRows(state: RetirementState): ClaimRow[] {
  const horizon = Math.max(0, state.lifeExpectancy - 62);
  void horizon;
  return range62to70().map((age) => {
    const monthly = state.socialSecurityMonthlyAt67 * ssClaimFactor(age);
    const years = Math.max(0, state.lifeExpectancy - age);
    return {
      claimAge: age,
      monthlyBenefit: Math.round(monthly),
      lifetimeTotal: Math.round(monthly * 12 * years),
      isCurrent: age === state.socialSecurityStartAge,
      isBest: false,
    };
  });
}

function range62to70(): number[] {
  return [62, 63, 64, 65, 66, 67, 68, 69, 70];
}

/** Spousal monthly benefit at a given spouse claim age (simplified SSA rules). */
export function spousalMonthly(
  primaryMonthlyAt67: number,
  spouseClaimAge: number
): number {
  const base = 0.5 * primaryMonthlyAt67;
  if (spouseClaimAge >= 67) return base; // no delayed credits on spousal
  // Reduced ~25/36% per month early (simplified to ~6.5%/yr, floored at 65% at 62).
  const factor = Math.max(0.65, 1 - 0.065 * (67 - spouseClaimAge));
  return base * factor;
}

export function optimizeHousehold(state: RetirementState): {
  primaryRows: ClaimRow[];
  spouseRows: ClaimRow[] | null;
  optimum: HouseholdOptimum;
} {
  const primaryRows = primaryClaimRows(state);
  const partnerOn = state.hasPartner && state.partner.enabled;

  if (!partnerOn) {
    let best = primaryRows[0];
    for (const r of primaryRows) if (r.lifetimeTotal > best.lifetimeTotal) best = r;
    const marked = primaryRows.map((r) => ({ ...r, isBest: r.claimAge === best.claimAge }));
    return {
      primaryRows: marked,
      spouseRows: null,
      optimum: { primaryAge: best.claimAge, spouseAge: null, householdLifetimeTotal: best.lifetimeTotal },
    };
  }

  const p = state.partner;
  // Spouse's own benefit rows (own earnings record).
  const spouseOwnRows = range62to70().map((age) => {
    const monthly = p.ssMonthlyAt67 * ssClaimFactor(age);
    const years = Math.max(0, p.lifeExpectancy - age);
    return { claimAge: age, monthlyBenefit: Math.round(monthly), lifetimeTotal: Math.round(monthly * 12 * years), isCurrent: age === p.ssStartAge, isBest: false };
  });

  // Joint optimum over primary age x spouse age, spouse gets max(own, spousal).
  let bestTotal = -1;
  let bestPrimary = 67;
  let bestSpouse = p.ssStartAge;
  for (const pr of primaryRows) {
    for (let sa = 62; sa <= 70; sa++) {
      const own = spouseOwnRows[sa - 62];
      const spousalMonthlyAmt = spousalMonthly(state.socialSecurityMonthlyAt67, sa);
      const spousalYears = Math.max(0, p.lifeExpectancy - sa);
      const spousalLifetime = spousalMonthlyAmt * 12 * spousalYears;
      const spouseBest = Math.max(own.lifetimeTotal, Math.round(spousalLifetime));
      const total = pr.lifetimeTotal + spouseBest;
      if (total > bestTotal) {
        bestTotal = total;
        bestPrimary = pr.claimAge;
        bestSpouse = sa;
      }
    }
  }

  return {
    primaryRows: primaryRows.map((r) => ({ ...r, isBest: r.claimAge === bestPrimary })),
    spouseRows: spouseOwnRows.map((r) => ({ ...r, isBest: r.claimAge === bestSpouse })),
    optimum: { primaryAge: bestPrimary, spouseAge: bestSpouse, householdLifetimeTotal: Math.round(bestTotal) },
  };
}
