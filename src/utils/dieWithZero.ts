// "Die with Zero" surplus readout: converts the plan's projected end-of-plan
// leftover (median path) into the extra yearly retirement spending that would
// roughly spend it down to ~$0 by the end of the horizon.
//
// Math (real terms, today's dollars):
//   - surplusReal = finalNetWorth / finalInflationFactor
//   - extra spend X each retired year accumulates to X * s_angle_N at real
//     rate rr, so X = surplusReal / s_angle_N where
//     s_angle_N = ((1 + rr)^N - 1) / rr (or N when rr ~= 0).
// rr mirrors the engine's expected-return inputs (allocation-weighted nominal
// returns and the inflation assumption), so the figure stays consistent with
// the plan instead of inventing its own market view. It is still a rough,
// median-path estimate — spending more lowers the Monte Carlo success rate.
import { RetirementState, SimulationResult } from '../types/retirement';
import { FINANCIAL_CONSTANTS } from './constants';

/** Minimum leftover worth mentioning (avoids silly "$12/yr" readouts). */
export const DIE_WITH_ZERO_MIN_SURPLUS = 1000;
/** Minimum retired-years horizon for the annuity math to be meaningful. */
export const DIE_WITH_ZERO_MIN_YEARS = 5;
/** Confidence gate: only suggest spending more from a plan that's on track. */
export const DIE_WITH_ZERO_MIN_SUCCESS_RATE = 80;

export interface DieWithZeroResult {
  /** Median leftover at the end of the plan (nominal $). */
  surplus: number;
  /** Spendable extra per retired year, in today's dollars (floored, conservative). */
  extraAnnualToday: number;
  /** Retired years the surplus is spread over. */
  retiredYears: number;
  /** Age the horizon ends at (partner-aware). */
  horizonAge: number;
}

/** End of the plan horizon, mirroring the engine (surviving spouse rules). */
export function dieWithZeroHorizonAge(state: RetirementState): number {
  const partnerOn = state.hasPartner && state.partner?.enabled;
  return partnerOn
    ? Math.max(state.lifeExpectancy, state.partner.lifeExpectancy)
    : state.lifeExpectancy;
}

/** Expected real portfolio return implied by the plan's own inputs. */
export function dieWithZeroRealRate(state: RetirementState): number {
  let baseInflation = 0.03;
  if (state.inflationMode === 'custom') baseInflation = state.customInflationRate / 100.0;

  const allocSum = Math.max(
    1e-9,
    state.stockPct + state.bondPct + state.cashPct
  );
  const nominal =
    (state.stockPct / allocSum) * ((state.customStockReturn || 9.8) / 100.0) +
    (state.bondPct / allocSum) * ((state.customBondReturn || 4.8) / 100.0) +
    (state.cashPct / allocSum) * FINANCIAL_CONSTANTS.DEFAULT_CASH_RETURN_NOMINAL;

  return (1 + nominal) / (1 + baseInflation) - 1;
}

export function calcDieWithZero(
  state: RetirementState,
  result: SimulationResult
): DieWithZeroResult | null {
  const surplus = result.finalNetWorth;
  if (!Number.isFinite(surplus) || surplus < DIE_WITH_ZERO_MIN_SURPLUS) return null;

  const horizonAge = dieWithZeroHorizonAge(state);
  const retiredYears = horizonAge - state.targetRetirementAge;
  if (!Number.isFinite(retiredYears) || retiredYears < DIE_WITH_ZERO_MIN_YEARS) return null;

  const last = result.yearlyProjections[result.yearlyProjections.length - 1];
  const endInflation = last?.inflationFactor;
  if (!endInflation || endInflation <= 0) return null;

  const rr = dieWithZeroRealRate(state);
  const annuityFactor =
    Math.abs(rr) < 1e-6
      ? retiredYears
      : (Math.pow(1 + rr, retiredYears) - 1) / rr;
  if (!Number.isFinite(annuityFactor) || annuityFactor <= 0) return null;

  const surplusReal = surplus / endInflation;
  const extra = Math.floor(surplusReal / annuityFactor / 100) * 100;
  if (extra < 100) return null;

  return {
    surplus: Math.round(surplus),
    extraAnnualToday: extra,
    retiredYears,
    horizonAge,
  };
}
