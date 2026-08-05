import React, { useState, useMemo, useEffect } from 'react';
import { RetirementState, SimulationResult } from './types/retirement';
import { runRetirementSimulation } from './utils/calculatorEngine';
import { decodeStateFromUrl } from './utils/urlEncoder';
import { exportToPdf } from './utils/pdfExport';
import { exportStateToFile, importStateFromFile } from './utils/fileExportImport';

import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { DemographicsSection } from './components/Accordions/DemographicsSection';
import { BaselineAssetsSection } from './components/Accordions/BaselineAssetsSection';
import { IncomeGrowthSection } from './components/Accordions/IncomeGrowthSection';
import { MarketInflationSection } from './components/Accordions/MarketInflationSection';
import { DependentsSection } from './components/Accordions/DependentsSection';
import { HousingLifestyleSection } from './components/Accordions/HousingLifestyleSection';
import { LocationColSection } from './components/Accordions/LocationColSection';

import { SummaryCards } from './components/Dashboard/SummaryCards';
import { RetirementChart } from './components/Dashboard/RetirementChart';
import { MilestoneTimeline } from './components/Dashboard/MilestoneTimeline';
import { YearlyTable } from './components/Dashboard/YearlyTable';

import { Layers, ChevronUp, ChevronDown } from 'lucide-react';

const DEFAULT_STATE: RetirementState = {
  currentAge: 32,
  targetRetirementAge: 60,
  lifeExpectancy: 90,

  liquidCash: 25000,
  taxableInvestments: 65000,
  preTax401k: 120000,
  postTaxRothHsa: 35000,
  debts: [],

  currentAnnualIncome: 145000,
  realIncomeGrowthMode: 'standard_2',
  customIncomeGrowthRate: 2,
  savingsRatePct: 22,
  fixedAnnualContribution: 30000,
  useFixedContribution: false,
  contributionSplit: {
    preTaxPct: 50,
    postTaxPct: 30,
    taxablePct: 20,
  },

  inflationMode: 'fixed_3',
  customInflationRate: 3.0,
  historicalInflationPreset: 'stagflation_1970s',

  stockPct: 80,
  bondPct: 15,
  cashPct: 5,

  returnMode: 'monte_carlo',
  customStockReturn: 9.5,
  customBondReturn: 4.5,

  hasChildren: true,
  children: [
    {
      id: 'child_1',
      name: 'Maya',
      currentAge: 4,
      schoolType: 'public',
      privateAnnualCost: 12000,
      collegeTier: 'in_state',
      collegeYears: 4,
      collegeAnnualCost: 24000,
    },
  ],

  housingType: 'mortgage',
  rentMonthly: 2500,
  rentInflationPct: 3.5,
  mortgageBalance: 380000,
  mortgageMonthly: 2450,
  mortgageInterestRate: 6.2,
  mortgageRemainingYears: 22,

  lifestyleTier: 'moderate',
  essentialExpensesMonthly: 3200,
  discretionaryExpensesMonthly: 1500,
  customCategories: [],

  targetLocationId: 'US_AVERAGE',
  colAdjustmentPct: 0,
  socialSecurityMonthlyAt67: 2800,
  socialSecurityStartAge: 67,
  pensionMonthly: 0,
  pensionStartAge: 65,
};

export function App() {
  const [state, setState] = useState<RetirementState>(DEFAULT_STATE);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);

  // Accordion Section Open/Close States
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    demographics: true,
    baseline: false,
    income: false,
    market: false,
    dependents: false,
    housing: false,
    location: false,
  });

  const [activeTab, setActiveTab] = useState<'chart' | 'timeline' | 'table'>('chart');

  // Load URL state if present
  useEffect(() => {
    const urlState = decodeStateFromUrl();
    if (urlState) {
      setState((prev) => ({ ...prev, ...urlState }));
      setToastMessage('Loaded shared scenario from URL hash!');
    }
  }, []);

  const handleChange = (updates: Partial<RetirementState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openSpecificSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: true }));
  };

  const setAllSections = (open: boolean) => {
    setOpenSections({
      demographics: open,
      baseline: open,
      income: open,
      market: open,
      dependents: open,
      housing: open,
      location: open,
    });
  };

  // High performance real-time simulation (<50ms re-render)
  const simulationResult: SimulationResult = useMemo(() => {
    return runRetirementSimulation(state);
  }, [state]);

  const handleExportPdf = async () => {
    await exportToPdf('dashboard-export-container', state, simulationResult);
  };

  const handleExportInputs = () => {
    try {
      exportStateToFile(state);
      setToastMessage('Exported all inputs to encoded scenario file!');
    } catch (err) {
      setToastMessage('Failed to export inputs file.');
    }
  };

  const handleImportInputs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedData = await importStateFromFile(file);
      setState((prev) => ({ ...prev, ...importedData }));
      setToastMessage('Successfully imported inputs from file!');
    } catch (err: any) {
      setToastMessage(err.message || 'Error reading import file.');
    }
    // Reset file input value so re-importing same file works
    e.target.value = '';
  };

  const handleLoadPreset = (presetName: string) => {
    if (presetName === 'tech_worker_sf') {
      setState({
        ...DEFAULT_STATE,
        currentAge: 29,
        targetRetirementAge: 52,
        currentAnnualIncome: 240000,
        savingsRatePct: 35,
        liquidCash: 45000,
        taxableInvestments: 180000,
        preTax401k: 140000,
        postTaxRothHsa: 50000,
        targetLocationId: 'PT_LISBON',
        housingType: 'rent',
        rentMonthly: 3600,
        essentialExpensesMonthly: 4500,
        discretionaryExpensesMonthly: 2500,
      });
    } else if (presetName === 'family_texas') {
      setState({
        ...DEFAULT_STATE,
        currentAge: 35,
        targetRetirementAge: 62,
        currentAnnualIncome: 160000,
        savingsRatePct: 20,
        targetLocationId: 'TX_AUSTIN',
        mortgageBalance: 420000,
        mortgageMonthly: 2800,
        mortgageRemainingYears: 25,
      });
    } else if (presetName === 'fire_early') {
      setState({
        ...DEFAULT_STATE,
        currentAge: 30,
        targetRetirementAge: 45,
        currentAnnualIncome: 180000,
        savingsRatePct: 55,
        lifestyleTier: 'minimalist',
        essentialExpensesMonthly: 2200,
        discretionaryExpensesMonthly: 800,
        targetLocationId: 'CR_SAN_JOSE',
      });
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans transition-colors duration-300`}>
      <Header
        state={state}
        onExportPdf={handleExportPdf}
        onExportInputs={handleExportInputs}
        onImportInputs={handleImportInputs}
        onLoadPreset={handleLoadPreset}
        onResetDefault={() => setState(DEFAULT_STATE)}
        onTriggerToast={(msg) => setToastMessage(msg)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        successRate={simulationResult.successRate}
      />

      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10">
        {/* Bento Grid Executive Dashboard with Inline Editing */}
        <SummaryCards
          result={simulationResult}
          state={state}
          onChange={handleChange}
        />

        {/* Main Dual-Pane Split Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Progressive Disclosure Accordions (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center justify-between px-1 mb-1">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" /> Plan Parameters
              </h2>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAllSections(true)}
                  className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <ChevronDown className="w-3.5 h-3.5" /> Expand All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setAllSections(false)}
                  className="text-slate-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <ChevronUp className="w-3.5 h-3.5" /> Collapse All
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <DemographicsSection
                state={state}
                onChange={handleChange}
                isOpen={openSections.demographics}
                onToggle={() => toggleSection('demographics')}
              />

              <BaselineAssetsSection
                state={state}
                onChange={handleChange}
                isOpen={openSections.baseline}
                onToggle={() => toggleSection('baseline')}
              />

              <IncomeGrowthSection
                state={state}
                onChange={handleChange}
                isOpen={openSections.income}
                onToggle={() => toggleSection('income')}
              />

              <MarketInflationSection
                state={state}
                onChange={handleChange}
                isOpen={openSections.market}
                onToggle={() => toggleSection('market')}
              />

              <DependentsSection
                state={state}
                onChange={handleChange}
                isOpen={openSections.dependents}
                onToggle={() => toggleSection('dependents')}
              />

              <HousingLifestyleSection
                state={state}
                onChange={handleChange}
                isOpen={openSections.housing}
                onToggle={() => toggleSection('housing')}
              />

              <LocationColSection
                state={state}
                onChange={handleChange}
                isOpen={openSections.location}
                onToggle={() => toggleSection('location')}
              />
            </div>
          </div>

          {/* Right Column: Sticky Visual Anchor Pane (7 cols) */}
          <div className="lg:col-span-7 space-y-5 lg:sticky lg:top-20" id="dashboard-export-container">
            {/* Dashboard Tab Controls */}
            <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
              <div className="flex gap-1 text-xs">
                {[
                  { id: 'chart', label: 'Multi-Scenario Chart' },
                  { id: 'timeline', label: 'Milestone Timeline' },
                  { id: 'table', label: 'Yearly Schedule' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-glow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 pr-2 hidden sm:block">
                Target: <strong className="text-slate-200">Age {state.targetRetirementAge}</strong>
              </div>
            </div>

            {/* Active Dashboard Tab Content */}
            {activeTab === 'chart' && (
              <RetirementChart
                yearlyProjections={simulationResult.yearlyProjections}
                targetRetirementAge={state.targetRetirementAge}
                onSelectSection={openSpecificSection}
              />
            )}

            {activeTab === 'timeline' && (
              <MilestoneTimeline
                yearlyProjections={simulationResult.yearlyProjections}
                onSelectSection={openSpecificSection}
              />
            )}

            {activeTab === 'table' && (
              <YearlyTable yearlyProjections={simulationResult.yearlyProjections} />
            )}
          </div>
        </div>
      </main>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        ApexRetire Pro — Modern Financial Modeling Engine.
      </footer>
    </div>
  );
}

export default App;
