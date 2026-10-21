/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YearlyTable, csvCell, buildCsv } from '../Dashboard/YearlyTable';

const row = (age: number, retired: boolean) => ({
  year: 2025 + (age - 32),
  age,
  isRetired: retired,
  inflationFactor: 1,
  netWorth50: 1000,
  netWorth95: 1000,
  netWorth10: 1000,
  liquidCash: 0,
  taxableInvestments: 0,
  preTaxAccount: 0,
  postTaxAccount: 0,
  totalDebtBalance: 0,
  totalPortfolio: 1000,
  grossIncome: 100,
  totalContributions: 10,
  livingExpenses: 5,
  housingExpenses: 0,
  childEducationExpenses: 0,
  healthcareExpenses: 0,
  debtPayments: 0,
  totalExpenses: 5,
  guaranteedRetirementIncome: 0,
  netWithdrawalNeeded: 0,
  taxPaid: 0,
  rothConverted: 0,
  spendingCutApplied: false,
  milestones: [],
}) as any;

describe('YearlyTable', () => {
  it('renders rows', () => {
    render(<YearlyTable yearlyProjections={[row(32, false), row(65, true)] as any} />);
    expect(screen.getByText(/Yearly Financial Cash Flow/)).toBeTruthy();
    expect(screen.getByText('Age 32')).toBeTruthy();
  });
  it('filter retired only', () => {
    render(<YearlyTable yearlyProjections={[row(32, false), row(65, true)] as any} />);
    fireEvent.click(screen.getByText('Show retirement years only'));
    expect(screen.queryByText('Age 32')).toBeNull();
    expect(screen.getByText('Age 65')).toBeTruthy();
  });
  it('export csv button', () => {
    render(<YearlyTable yearlyProjections={[row(32, false)] as any} />);
    const btn = screen.getByText('Export CSV');
    expect(btn).toBeTruthy();
  });
});

describe('YearlyTable helpers', () => {
  it('csvCell quotes when needed', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell(5)).toBe('5');
  });
  it('buildCsv includes header', () => {
    const csv = buildCsv([row(32, false)] as any);
    expect(csv).toContain('Year');
    expect(csv.split('\r\n').length).toBe(2);
  });
});
