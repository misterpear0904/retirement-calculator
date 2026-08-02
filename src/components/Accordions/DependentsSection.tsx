import React from 'react';
import { Baby, Plus, Trash2, GraduationCap } from 'lucide-react';
import { RetirementState, ChildItem, SchoolType, CollegeTier } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';

interface Props {
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const DependentsSection: React.FC<Props> = ({
  state,
  onChange,
  isOpen,
  onToggle,
}) => {
  const handleAddChild = () => {
    const newChild: ChildItem = {
      id: `child_${Date.now()}`,
      name: `Child ${state.children.length + 1}`,
      currentAge: 3,
      schoolType: 'public',
      privateAnnualCost: 15000,
      collegeTier: 'in_state',
      collegeYears: 4,
      collegeAnnualCost: 25000,
    };
    onChange({
      hasChildren: true,
      children: [...state.children, newChild],
    });
  };

  const handleUpdateChild = (id: string, field: keyof ChildItem, value: any) => {
    const updated = state.children.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    onChange({ children: updated });
  };

  const handleRemoveChild = (id: string) => {
    const updated = state.children.filter((c) => c.id !== id);
    onChange({
      children: updated,
      hasChildren: updated.length > 0,
    });
  };

  return (
    <AccordionWrapper
      id="dependents"
      title="Section E: Dependents & Education Expenses"
      subtitle="K-12 private schooling and higher education college funding"
      icon={<Baby className="w-5 h-5" />}
      isOpen={isOpen}
      onToggle={onToggle}
      badgeText={state.hasChildren ? `${state.children.length} Children Profiled` : 'No Children'}
    >
      <div className="pt-2 space-y-4">
        {/* Toggle Children */}
        <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">Have Dependents / Children?</span>
            <span className="text-[11px] text-slate-400">Configure child age, K-12 schooling, and college tier</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextVal = !state.hasChildren;
                if (nextVal && state.children.length === 0) {
                  handleAddChild();
                } else {
                  onChange({ hasChildren: nextVal });
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                state.hasChildren
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {state.hasChildren ? 'Yes (Children Added)' : 'No Children'}
            </button>
          </div>
        </div>

        {/* Dynamic Reveal: Children Profiles List */}
        {state.hasChildren && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Child Profiles & Education Plans
              </h4>
              <button
                type="button"
                onClick={handleAddChild}
                className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> Add Child Profile
              </button>
            </div>

            {state.children.map((child, index) => (
              <div
                key={child.id}
                className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-blue-400" />
                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => handleUpdateChild(child.id, 'name', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2 py-0.5 text-xs font-bold text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChild(child.id)}
                    className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Current Age */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Current Child Age</label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={child.currentAge}
                      onChange={(e) => handleUpdateChild(child.id, 'currentAge', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-semibold"
                    />
                  </div>

                  {/* K-12 School Type */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">K-12 Schooling</label>
                    <select
                      value={child.schoolType}
                      onChange={(e) => handleUpdateChild(child.id, 'schoolType', e.target.value as SchoolType)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100"
                    >
                      <option value="public">Public School ($0/yr)</option>
                      <option value="private_k12">Private K-12</option>
                    </select>
                  </div>

                  {/* College Tier */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Higher Ed Tier</label>
                    <select
                      value={child.collegeTier}
                      onChange={(e) => {
                        const tier = e.target.value as CollegeTier;
                        let cost = 25000;
                        if (tier === 'private') cost = 55000;
                        if (tier === 'none') cost = 0;
                        handleUpdateChild(child.id, 'collegeTier', tier);
                        handleUpdateChild(child.id, 'collegeAnnualCost', cost);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100"
                    >
                      <option value="in_state">Public In-State ($25k/yr)</option>
                      <option value="private">Private University ($55k/yr)</option>
                      <option value="none">No College Funding ($0)</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Fields based on School / College selections */}
                {child.schoolType === 'private_k12' && (
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs animate-fade-in">
                    <span className="text-slate-400">Private K-12 Annual Cost:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={child.privateAnnualCost}
                        onChange={(e) => handleUpdateChild(child.id, 'privateAnnualCost', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-bold"
                      />
                      <span className="text-slate-400">/yr</span>
                    </div>
                  </div>
                )}

                {child.collegeTier !== 'none' && (
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs animate-fade-in">
                    <span className="text-slate-400 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-400" /> College Annual Cost ({child.collegeYears} yrs):
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">$</span>
                      <input
                        type="number"
                        step={2500}
                        value={child.collegeAnnualCost}
                        onChange={(e) => handleUpdateChild(child.id, 'collegeAnnualCost', parseFloat(e.target.value) || 0)}
                        className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-bold text-right"
                      />
                      <span className="text-slate-400">/yr</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AccordionWrapper>
  );
};
