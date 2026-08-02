import React from 'react';
import { Wallet, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { RetirementState, DebtItem } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';

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

  const handleDebtChange = (id: string, field: keyof DebtItem, value: any) => {
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
      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Current Liquid & Investment Assets
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Liquid Cash */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Liquid Cash & Emergency Fund
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-500">$</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={state.liquidCash}
                onChange={(e) => onChange({ liquidCash: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Taxable Investments */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Taxable Brokerage / Stocks
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-500">$</span>
              <input
                type="number"
                min={0}
                step={5000}
                value={state.taxableInvestments}
                onChange={(e) => onChange({ taxableInvestments: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pre-Tax Accounts */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Pre-Tax (401k / Trad IRA)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-500">$</span>
              <input
                type="number"
                min={0}
                step={5000}
                value={state.preTax401k}
                onChange={(e) => onChange({ preTax401k: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Post-Tax Accounts */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Post-Tax (Roth IRA / HSA)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-500">$</span>
              <input
                type="number"
                min={0}
                step={5000}
                value={state.postTaxRothHsa}
                onChange={(e) => onChange({ postTaxRothHsa: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Debts & Liabilities Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Debts & Non-Mortgage Liabilities
          </h4>
          <button
            type="button"
            onClick={handleAddDebt}
            className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Liability
          </button>
        </div>

        {state.debts.length === 0 ? (
          <p className="text-xs text-slate-500 italic bg-slate-800/30 p-3 rounded-xl text-center border border-slate-800">
            No active non-mortgage liabilities. (Mortgages are configured under Section F).
          </p>
        ) : (
          <div className="space-y-2.5">
            {state.debts.map((debt) => (
              <div
                key={debt.id}
                className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 items-center"
              >
                <div>
                  <label className="text-[10px] text-slate-400 block">Name</label>
                  <input
                    type="text"
                    value={debt.name}
                    onChange={(e) => handleDebtChange(debt.id, 'name', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Balance ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={debt.balance}
                    onChange={(e) => handleDebtChange(debt.id, 'balance', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Interest Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={debt.interestRate}
                    onChange={(e) => handleDebtChange(debt.id, 'interestRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block">Monthly ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={debt.monthlyPayment}
                      onChange={(e) => handleDebtChange(debt.id, 'monthlyPayment', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDebt(debt.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
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
