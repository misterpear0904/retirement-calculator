import React from 'react';
import { Wallet, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { RetirementState, DebtItem } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';
import { NumberField } from '../NumberField';

interface Props {
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const BaselineAssetsSection: React.FC<Props> = ({
  state,
  onChange,
  isOpen,
  onToggle,
}) => {
  const totalAssets =
    state.liquidCash +
    state.taxableInvestments +
    state.preTax401k +
    state.postTaxRothHsa;

  const totalDebts = state.debts.reduce((sum, d) => sum + d.balance, 0);
  const netStartingAssets = totalAssets - totalDebts;

  const handleDebtChange = (id: string, field: keyof DebtItem, value: string | number) => {
    const updated = state.debts.map((debt) =>
      debt.id === id ? { ...debt, [field]: value } : debt
    );
    onChange({ debts: updated });
  };

  const handleAddDebt = () => {
    const newDebt: DebtItem = {
      id: `debt_${Date.now()}`,
      name: 'Personal Loan / Card',
      balance: 10000,
      interestRate: 6.5,
      monthlyPayment: 250,
    };
    onChange({ debts: [...state.debts, newDebt] });
  };

  const handleRemoveDebt = (id: string) => {
    onChange({ debts: state.debts.filter((d) => d.id !== id) });
  };

  return (
    <AccordionWrapper
      id="baseline"
      title="Section B: Current Financial Baseline"
      subtitle="Liquid cash, pre/post-tax investments, and active liabilities"
      icon={<Wallet className="w-5 h-5" />}
      isOpen={isOpen}
      onToggle={onToggle}
      badgeText={`$${Math.round(netStartingAssets).toLocaleString()} Net Baseline`}
    >
      {/* Assets Breakdown Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-2">
          Current Liquid & Investment Assets
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Liquid Cash */}
          <div className="dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-2">
            <label className="text-xs font-medium dark:text-slate-300 text-slate-700 block">
              Liquid Cash & Emergency Fund
            </label>
            <NumberField
              id="liquid-cash"
              value={state.liquidCash}
              onChange={(v) => onChange({ liquidCash: v })}
              ariaLabel="Liquid cash and emergency fund in dollars"
              prefix="$"
            />
          </div>

          {/* Taxable Investments */}
          <div className="dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-2">
            <label className="text-xs font-medium dark:text-slate-300 text-slate-700 block">
              Taxable Brokerage / Stocks
            </label>
            <NumberField
              id="taxable-investments"
              value={state.taxableInvestments}
              onChange={(v) => onChange({ taxableInvestments: v })}
              ariaLabel="Taxable brokerage investments in dollars"
              prefix="$"
            />
          </div>

          {/* Pre-Tax Accounts */}
          <div className="dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-2">
            <label className="text-xs font-medium dark:text-slate-300 text-slate-700 block">
              Pre-Tax (401k / Trad IRA)
            </label>
            <NumberField
              id="pre-tax-401k"
              value={state.preTax401k}
              onChange={(v) => onChange({ preTax401k: v })}
              ariaLabel="Pre-tax 401k and traditional IRA balance in dollars"
              prefix="$"
            />
          </div>

          {/* Post-Tax Accounts */}
          <div className="dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-2">
            <label className="text-xs font-medium dark:text-slate-300 text-slate-700 block">
              Post-Tax (Roth IRA / HSA)
            </label>
            <NumberField
              id="post-tax-roth-hsa"
              value={state.postTaxRothHsa}
              onChange={(v) => onChange({ postTaxRothHsa: v })}
              ariaLabel="Post-tax Roth and HSA balance in dollars"
              prefix="$"
            />
          </div>
        </div>
      </div>

      {/* Debts & Liabilities Section */}
      <div className="pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" /> Debts & Non-Mortgage Liabilities
          </h4>
          <button
            type="button"
            onClick={handleAddDebt}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Liability
          </button>
        </div>

        {state.debts.length === 0 ? (
          <p className="text-xs dark:text-slate-400 text-slate-600 italic dark:bg-slate-800/30 bg-slate-100 p-4 rounded-xl text-center border dark:border-slate-800 border-slate-200 leading-relaxed">
            No active non-mortgage liabilities. (Mortgages are configured under Section F).
          </p>
        ) : (
          <div className="space-y-3">
            {state.debts.map((debt) => (
              <div
                key={debt.id}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3 dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/40 border-slate-300/40 items-center"
              >
                <div>
                  <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Name</label>
                  <input
                    type="text"
                    value={debt.name}
                    onChange={(e) => handleDebtChange(debt.id, 'name', e.target.value)}
                    className="w-full dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 rounded-lg px-2.5 py-1.5 text-xs dark:text-slate-100 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Balance ($)</label>
                  <NumberField
                    id={`debt-balance-${debt.id}`}
                    value={debt.balance}
                    onChange={(v) => handleDebtChange(debt.id, 'balance', v)}
                    ariaLabel={`Balance for ${debt.name || 'liability'}`}
                    prefix="$"
                  />
                </div>
                <div>
                  <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Interest Rate (%)</label>
                  <NumberField
                    id={`debt-rate-${debt.id}`}
                    value={debt.interestRate}
                    onChange={(v) => handleDebtChange(debt.id, 'interestRate', v)}
                    ariaLabel={`Interest rate percentage for ${debt.name || 'liability'}`}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Monthly ($)</label>
                    <NumberField
                      id={`debt-payment-${debt.id}`}
                      value={debt.monthlyPayment}
                      onChange={(v) => handleDebtChange(debt.id, 'monthlyPayment', v)}
                      ariaLabel={`Monthly payment for ${debt.name || 'liability'}`}
                      prefix="$"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDebt(debt.id)}
                    className="p-2 dark:text-slate-400 text-slate-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccordionWrapper>
  );
};
