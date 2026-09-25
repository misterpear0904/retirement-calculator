import React, { useState, useMemo, useEffect } from 'react';
import { RetirementState, SimulationResult } from './types/retirement';
import { runRetirementSimulation } from './utils/calculatorEngine';
import { decodeStateFromUrl, clearScenarioFromUrl } from './utils/urlEncoder';
import { exportToPdf } from './utils/pdfExport';
import { exportStateToFile, importStateFromFile } from './utils/fileExportImport';
import { sanitizeRetirementState, validateRetirementState } from './utils/validation';
import { DEFAULT_STATE, applyPreset } from './data/presets';

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

import { Layers, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

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
      setState((prev) => sanitizeRetirementState({ ...prev, ...urlState }));
      setToastMessage('Loaded shared scenario from URL hash!');
      clearScenarioFromUrl();
    }
  }, []);

  // Keep Tailwind `dark` class in sync (index.html starts with class="dark").
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Auto-dismiss toast after a few seconds.
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const handleChange = (updates: Partial<RetirementState>) => {
    setState((prev) => sanitizeRetirementState({ ...prev, ...updates }));
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

  // Debounce the expensive 500-trial Monte Carlo sim so slider drags stay smooth.
  const debouncedState = useDebouncedValue(state, 150);

  // High performance real-time simulation
  const simulationResult: SimulationResult = useMemo(() => {
    return runRetirementSimulation(debouncedState);
  }, [debouncedState]);

  const validationIssues = useMemo(() => validateRetirementState(state), [state]);

  const handleExportPdf = async () => {
    try {
      await exportToPdf('dashboard-export-container', state, simulationResult);
    } catch {
      setToastMessage('Failed to generate PDF. Please try again.');
    }
  };

  const handleExportInputs = () => {
    try {
      exportStateToFile(state);
      setToastMessage('Exported all inputs to scenario file!');
    } catch {
      setToastMessage('Failed to export inputs file.');
    }
  };

  const handleImportInputs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedData = await importStateFromFile(file);
      setState((prev) => sanitizeRetirementState({ ...prev, ...importedData }));
      setToastMessage('Successfully imported inputs from file!');
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Error reading import file.');
    }
    // Reset file input value so re-importing same file works
    e.target.value = '';
  };

  const handleLoadPreset = (presetName: string) => {
    setState(applyPreset(DEFAULT_STATE, presetName));
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
        {validationIssues.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-3 text-xs dark:bg-amber-500/10 bg-amber-50 dark:border-amber-500/30 border-amber-300 dark:text-amber-300 text-amber-800 border rounded-xl px-4 py-3"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <ul className="space-y-1">
              {validationIssues.map((issue) => (
                <li key={issue.field}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

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
              <h2 className="text-xs font-extrabold uppercase tracking-wider dark:text-slate-400 text-slate-500 flex items-center gap-2">
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
                <span className="dark:text-slate-600 text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setAllSections(false)}
                  className="dark:text-slate-400 text-slate-500 hover:underline flex items-center gap-1 font-medium"
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
            <div className="flex items-center justify-between dark:bg-slate-900/80 bg-white p-1.5 rounded-xl border dark:border-slate-800 border-slate-200 backdrop-blur-md">
              <div className="flex gap-1 text-xs" role="tablist" aria-label="Dashboard views">
                {[
                  { id: 'chart', label: 'Multi-Scenario Chart' },
                  { id: 'timeline', label: 'Milestone Timeline' },
                  { id: 'table', label: 'Yearly Schedule' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-glow'
                        : 'dark:text-slate-400 text-slate-500 hover:text-slate-200 dark:hover:bg-slate-800/60 hover:bg-slate-100'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-[11px] dark:text-slate-400 text-slate-500 pr-2 hidden sm:block">
                Target: <strong className="dark:text-slate-200 text-slate-800">Age {state.targetRetirementAge}</strong>
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

      <footer className="border-t dark:border-slate-900 border-slate-200 dark:bg-slate-950 bg-white py-6 mt-12 text-center text-xs dark:text-slate-500 text-slate-500">
        ApexRetire Pro — Modern Financial Modeling Engine. Estimates only, not financial advice.
      </footer>
    </div>
  );
}

export default App;
