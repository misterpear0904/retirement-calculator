import React, { useState } from 'react';
import { Home, ShoppingBag, Plus, Trash2, HeartPulse, Waves, ChevronDown } from 'lucide-react';
import { RetirementState, HousingType, LifestyleTier, CustomExpenseCategory } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';
import { InfoTip } from '../InfoTip';
import { NumberField } from '../NumberField';

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
  const [smileOpen, setSmileOpen] = useState(false);

  const smile = state.spendingSmile;
  // Engine treats undefined includeMedicarePremiums as ON (toggle renders on until explicitly disabled).
  const medicareOn = state.includeMedicarePremiums !== false;

  const handleAddCustomCategory = () => {
    const newCat: CustomExpenseCategory = {
      id: `cat_${Date.now()}`,
      name: 'Travel & Hobbies',
      monthlyAmount: 500,
    };
    onChange({ customCategories: [...state.customCategories, newCat] });
  };

  const handleUpdateCustomCategory = (id: string, field: keyof CustomExpenseCategory, value: string | number) => {
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
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider flex items-center gap-2">
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
                      : 'dark:bg-slate-900 bg-white dark:text-slate-400 text-slate-600 dark:border-slate-800 border-slate-200 hover:text-slate-200'
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
                <label className="text-xs font-medium dark:text-slate-300 text-slate-700 block mb-1">Mortgage Balance ($)</label>
                <NumberField
                id="mortgage-balance"
                value={state.mortgageBalance}
                onChange={(v) => onChange({ mortgageBalance: v })}
                ariaLabel="Mortgage balance in dollars"
                prefix="$"
              />
              </div>

              <div>
                <label className="text-xs font-medium dark:text-slate-300 text-slate-700 block mb-1">Monthly Payment (P&I+Tax+Ins)</label>
                <NumberField
                id="mortgage-monthly"
                value={state.mortgageMonthly}
                onChange={(v) => onChange({ mortgageMonthly: v })}
                ariaLabel="Monthly mortgage payment"
                prefix="$"
              />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium dark:text-slate-300 text-slate-700 block mb-1">Remaining Term (Years)</label>
                <NumberField
                id="mortgage-years"
                value={state.mortgageRemainingYears}
                onChange={(v) => onChange({ mortgageRemainingYears: Math.max(1, Math.round(v)) })}
                ariaLabel="Mortgage remaining term in years"
              />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-fade-in text-xs">
              <div>
                <label className="text-xs font-medium dark:text-slate-300 text-slate-700 block mb-1">Monthly Rent ($)</label>
                <NumberField
                id="rent-monthly"
                value={state.rentMonthly}
                onChange={(v) => onChange({ rentMonthly: v })}
                ariaLabel="Monthly rent in dollars"
                prefix="$"
              />
              </div>

              <div>
                <label className="text-xs font-medium dark:text-slate-300 text-slate-700 block mb-1">Est. Annual Rent Inflation (%)</label>
                <NumberField
                id="rent-inflation"
                value={state.rentInflationPct}
                onChange={(v) => onChange({ rentInflationPct: v })}
                ariaLabel="Annual rent inflation percentage"
              />
              </div>
            </div>
          )}
        </div>

        {/* Lifestyle & Expense Tiering */}
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider flex items-center gap-2">
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
                    : 'dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-600 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Essential & Discretionary Monthly Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Essential Living ($/month)</label>
              <NumberField
                id="essential-expenses"
                value={state.essentialExpensesMonthly}
                onChange={(v) => onChange({ essentialExpensesMonthly: v })}
                ariaLabel="Essential living expenses per month"
                prefix="$"
              />
            </div>

            <div>
              <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Discretionary / Fun ($/month)</label>
              <NumberField
                id="discretionary-expenses"
                value={state.discretionaryExpensesMonthly}
                onChange={(v) => onChange({ discretionaryExpensesMonthly: v })}
                ariaLabel="Discretionary expenses per month"
                prefix="$"
              />
            </div>
          </div>

          {/* Custom Expense Categories */}
          {state.lifestyleTier === 'custom' && (
            <div className="pt-3 space-y-3 border-t dark:border-slate-700/50 border-slate-300/50 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold dark:text-slate-300 text-slate-700">Custom Monthly Line Items</span>
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:underline font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Category
                </button>
              </div>

              {state.customCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2.5 text-xs dark:bg-slate-900 bg-white p-2.5 rounded-xl border dark:border-slate-800 border-slate-200">
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => handleUpdateCustomCategory(cat.id, 'name', e.target.value)}
                    className="flex-1 bg-slate-950 border dark:border-slate-700 border-slate-300 rounded-lg px-2.5 py-1.5 dark:text-slate-100 text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-bold">$</span>
                    <NumberField
                      id={`custom-cat-${cat.id}`}
                      value={cat.monthlyAmount}
                      onChange={(v) => handleUpdateCustomCategory(cat.id, 'monthlyAmount', v)}
                      ariaLabel={`Monthly amount for ${cat.name || 'custom category'}`}
                      className="w-24"
                    />
                    <span className="dark:text-slate-400 text-slate-600">/mo</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomCategory(cat.id)}
                    className="p-1.5 dark:text-slate-400 text-slate-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Healthcare costs */}
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-400 shrink-0" /> Healthcare Costs
            <InfoTip term="healthcare" />
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Monthly Cost at 65 ($)</label>
              <NumberField
                id="healthcare-monthly"
                value={state.healthcareMonthlyAt65}
                onChange={(v) => onChange({ healthcareMonthlyAt65: v })}
                ariaLabel="Healthcare monthly cost at 65"
                prefix="$"
              />
            </div>
            <div>
              <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Medical Inflation (%/yr)</label>
              <NumberField
                id="healthcare-inflation"
                value={state.healthcareInflationPct}
                onChange={(v) => onChange({ healthcareInflationPct: v })}
                ariaLabel="Medical inflation percentage per year"
              />
            </div>
            <div>
              <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Starts at Age</label>
              <NumberField
                id="healthcare-start-age"
                value={state.healthcareStartAge}
                onChange={(v) => onChange({ healthcareStartAge: Math.round(v) })}
                ariaLabel="Healthcare costs start age"
              />
            </div>
          </div>
          {/* Medicare premiums toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 dark:bg-slate-900 bg-white p-3.5 rounded-xl border dark:border-slate-800 border-slate-200">
            <div>
              <span className="text-xs font-semibold dark:text-slate-200 text-slate-800 block">
                Add Medicare premiums automatically
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                Part B + IRMAA (2026 schedule) are added to your healthcare costs from age 65.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={medicareOn}
              aria-label="Add Medicare premiums automatically from age 65"
              onClick={() => onChange({ includeMedicarePremiums: !medicareOn })}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                medicareOn ? 'bg-rose-500' : 'dark:bg-slate-700 bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                  medicareOn ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Set to $0 to exclude. Costs grow at medical inflation from the start age and are weighted by
            your destination&apos;s healthcare index.
          </p>
        </div>

        {/* Spending smile (early / mid / late retirement multipliers) */}
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <button
            type="button"
            onClick={() => setSmileOpen((v) => !v)}
            aria-expanded={smileOpen}
            className="w-full flex items-center justify-between gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          >
            <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Waves className="w-4 h-4 text-sky-400 shrink-0" /> Spending Curve Over Retirement
            </h4>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                {smile.early.toFixed(1)}× / {smile.mid.toFixed(1)}× / {smile.late.toFixed(1)}×
              </span>
              <ChevronDown
                className={`w-4 h-4 dark:text-slate-400 text-slate-600 transition-transform duration-300 ${smileOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {!smileOpen && (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Front/late-load your retirement years — models the travel-then-care curve.
            </p>
          )}

          {smileOpen && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Front/late-load your retirement years — models the travel-then-care curve. The base
                monthly budget is unchanged; these multipliers shape when spend happens.
              </p>

              <div className="space-y-3">
                {[
                  { key: 'early' as const, label: 'Explore more early', color: 'text-sky-400' },
                  { key: 'mid' as const, label: 'Even mid', color: 'text-emerald-400' },
                  { key: 'late' as const, label: 'Care later', color: 'text-amber-400' },
                ].map((row) => (
                  <div key={row.key}>
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span className={row.color}>{row.label}</span>
                      <span className={`font-bold ${row.color}`}>
                        {smile[row.key].toFixed(1)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={smile[row.key]}
                      aria-label={row.label}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const v = parseFloat(raw);
                        if (!Number.isFinite(v)) return;
                        onChange({ spendingSmile: { ...smile, [row.key]: v } });
                      }}
                      className="w-full cursor-pointer accent-sky-500 min-h-[44px]"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[11px] dark:text-slate-400 text-slate-600 mb-1">
                    <span>&ldquo;Early&rdquo; ends at age</span>
                    <span className="font-bold text-sky-400">{state.spendingSmileStartAge}</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={80}
                    step={1}
                    value={state.spendingSmileStartAge}
                    aria-label="Age when the early spending phase ends"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') return;
                      const v = parseInt(raw);
                      if (!Number.isFinite(v)) return;
                      onChange({
                        spendingSmileStartAge: v,
                        // Mid must end after early: keep the engine's clamp in sync.
                        spendingSmileMidAge: Math.max(v + 1, state.spendingSmileMidAge),
                      });
                    }}
                    className="w-full cursor-pointer accent-sky-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] dark:text-slate-400 text-slate-600 mb-1">
                    <span>&ldquo;Mid&rdquo; ends at age</span>
                    <span className="font-bold text-emerald-400">{state.spendingSmileMidAge}</span>
                  </div>
                  <input
                    type="range"
                    min={70}
                    max={90}
                    step={1}
                    value={state.spendingSmileMidAge}
                    aria-label="Age when the mid spending phase ends"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') return;
                      const v = parseInt(raw);
                      if (!Number.isFinite(v)) return;
                      onChange({
                        spendingSmileMidAge: v,
                        // Early must end before mid: keep the two phases ordered.
                        spendingSmileStartAge: Math.min(v - 1, state.spendingSmileStartAge),
                      });
                    }}
                    className="w-full cursor-pointer accent-emerald-500 min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccordionWrapper>
  );
};
