import React from 'react';
import { Home, ShoppingBag, Plus, Trash2 } from 'lucide-react';
import { RetirementState, HousingType, LifestyleTier, CustomExpenseCategory } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';

interface Props {
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const HousingLifestyleSection: React.FC<Props> = ({
  state,
  onChange,
  isOpen,
  onToggle,
}) => {
  const handleAddCustomCategory = () => {
    const newCat: CustomExpenseCategory = {
      id: `cat_${Date.now()}`,
      name: 'Travel & Hobbies',
      monthlyAmount: 500,
    };
    onChange({ customCategories: [...state.customCategories, newCat] });
  };

  const handleUpdateCustomCategory = (id: string, field: keyof CustomExpenseCategory, value: any) => {
    const updated = state.customCategories.map((cat) =>
      cat.id === id ? { ...cat, [field]: value } : cat
    );
    onChange({ customCategories: updated });
  };

  const handleRemoveCustomCategory = (id: string) => {
    onChange({ customCategories: state.customCategories.filter((cat) => cat.id !== id) });
  };

  const currentHousingMonthly = state.housingType === 'mortgage' ? state.mortgageMonthly : state.rentMonthly;

  return (
    <AccordionWrapper
      id="housing"
      title="Section F: Housing & Lifestyle Budget"
      subtitle="Housing payments, essential expenses, and discretionary lifestyle tiers"
      icon={<Home className="w-5 h-5" />}
      isOpen={isOpen}
      onToggle={onToggle}
      badgeText={`$${currentHousingMonthly + state.essentialExpensesMonthly + state.discretionaryExpensesMonthly}/mo Total Base`}
    >
      <div className="space-y-5 pt-2">
        {/* Housing Choice Toggle */}
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-400 shrink-0" /> Primary Housing Type
            </h4>
            <div className="flex gap-2">
              {[
                { id: 'mortgage', label: 'Mortgage' },
                { id: 'rent', label: 'Rent' },
              ].map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onChange({ housingType: h.id as HousingType })}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                    state.housingType === h.id
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Reveal based on Rent vs Mortgage */}
          {state.housingType === 'mortgage' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-fade-in text-xs">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Mortgage Balance ($)</label>
                <input
                  type="number"
                  step={10000}
                  value={state.mortgageBalance}
                  onChange={(e) => onChange({ mortgageBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Monthly Payment (P&I+Tax+Ins)</label>
                <input
                  type="number"
                  step={100}
                  value={state.mortgageMonthly}
                  onChange={(e) => onChange({ mortgageMonthly: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-300 block mb-1">Remaining Term (Years)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={state.mortgageRemainingYears}
                  onChange={(e) => onChange({ mortgageRemainingYears: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-fade-in text-xs">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Monthly Rent ($)</label>
                <input
                  type="number"
                  step={100}
                  value={state.rentMonthly}
                  onChange={(e) => onChange({ rentMonthly: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Est. Annual Rent Inflation (%)</label>
                <input
                  type="number"
                  step={0.5}
                  value={state.rentInflationPct}
                  onChange={(e) => onChange({ rentInflationPct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Lifestyle & Expense Tiering */}
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 space-y-4">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" /> Lifestyle & Discretionary Expense Tier
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'minimalist', label: 'Minimalist' },
              { id: 'moderate', label: 'Moderate' },
              { id: 'luxury', label: 'Luxury' },
              { id: 'custom', label: 'Custom' },
            ].map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => onChange({ lifestyleTier: tier.id as LifestyleTier })}
                className={`p-2.5 rounded-xl text-center transition-all text-xs border font-medium shadow-sm ${
                  state.lifestyleTier === tier.id
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Essential & Discretionary Monthly Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Essential Living ($/month)</label>
              <input
                type="number"
                step={250}
                value={state.essentialExpensesMonthly}
                onChange={(e) => onChange({ essentialExpensesMonthly: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Discretionary / Fun ($/month)</label>
              <input
                type="number"
                step={250}
                value={state.discretionaryExpensesMonthly}
                onChange={(e) => onChange({ discretionaryExpensesMonthly: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-semibold text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Expense Categories */}
          {state.lifestyleTier === 'custom' && (
            <div className="pt-3 space-y-3 border-t border-slate-700/50 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-300">Custom Monthly Line Items</span>
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:underline font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Category
                </button>
              </div>

              {state.customCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2.5 text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => handleUpdateCustomCategory(cat.id, 'name', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-bold">$</span>
                    <input
                      type="number"
                      step={50}
                      value={cat.monthlyAmount}
                      onChange={(e) => handleUpdateCustomCategory(cat.id, 'monthlyAmount', parseFloat(e.target.value) || 0)}
                      className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                    />
                    <span className="text-slate-400">/mo</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomCategory(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AccordionWrapper>
  );
};
