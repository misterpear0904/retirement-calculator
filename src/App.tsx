import React, { useState, useMemo, useEffect } from 'react';
import { RetirementState, SimulationResult, TaxFilingStatus } from './types/retirement';
import { runRetirementSimulation } from './utils/calculatorEngine';
import { decodeStateFromUrl, clearScenarioFromUrl } from './utils/urlEncoder';
import { listScenarios } from './utils/scenarios';
import { saveStateToStorage, loadStateFromStorage } from './utils/storage';
import { exportStateToFile, importStateFromFile } from './utils/fileExportImport';
import { sanitizeRetirementState, validateRetirementState, describeClamp } from './utils/validation';
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
import { TaxStrategySection } from './components/Accordions/TaxStrategySection';

import { SummaryCards } from './components/Dashboard/SummaryCards';
import { RetirementChart } from './components/Dashboard/RetirementChart';
import { MilestoneTimeline } from './components/Dashboard/MilestoneTimeline';
import { YearlyTable } from './components/Dashboard/YearlyTable';
import { BenchmarkCompare } from './components/Dashboard/BenchmarkCompare';
import { ScenariosTab } from './components/Dashboard/ScenariosTab';
import { SensitivityTab } from './components/Dashboard/SensitivityTab';
import { SolverTab } from './components/Dashboard/SolverTab';
import { BasicModeInputs } from './components/BasicModeInputs';

import { Layers, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';

/**
 * Dashboard tabs in display order — drives the Alt+1..N keyboard shortcuts.
 */
const DASHBOARD_TABS = [
  { id: 'chart', label: 'Multi-Scenario Chart' },
  { id: 'timeline', label: 'Milestone Timeline' },
  { id: 'table', label: 'Yearly Schedule' },
  { id: 'compare', label: 'Global Compare' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'sensitivity', label: 'What-If' },
  { id: 'solve', label: 'Solve' },
] as const;

type DashboardTabId = (typeof DASHBOARD_TABS)[number]['id'];

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

  // Keeps heavy recalcs (e.g. spending-strategy switches) interruptible so the
  // UI never freezes while a synchronous simulation re-runs.
  const [isRecalculating, startTransition] = React.useTransition();

  // Accordion Section Open/Close States
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    demographics: true,
    baseline: false,
    income: false,
    market: false,
    dependents: false,
    housing: false,
    location: false,
    tax: false,
  });

  const [activeTab, setActiveTab] = useState<DashboardTabId>('chart');

  // Scenario overlay on the main chart (P4 task 32): off by default, capped
  // at 5 overlays, recomputed only while the chart tab is active.
  const [showOverlays, setShowOverlays] = useState(false);
  const overlayScenarios = useMemo(() => {
    if (!showOverlays || activeTab !== 'chart') return [];
    try {
      return listScenarios()
        .slice(0, 5)
        .map((s) => {
          try {
            const sim = runRetirementSimulation(sanitizeRetirementState({ ...s.state }), { trials: 1 });
            return { name: s.name, yearlyProjections: sim.yearlyProjections };
          } catch {
            return null;
          }
        })
        .filter((o): o is { name: string; yearlyProjections: SimulationResult['yearlyProjections'] } => o !== null);
    } catch {
      return [];
    }
  }, [showOverlays, activeTab, state]);
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // Basic vs Advanced input mode. Basic is the default: 7 essentials only.
  const [mode, setMode] = useState<'basic' | 'advanced'>(() => {
    try {
      return window.localStorage.getItem('apexretire-mode') === 'advanced' ? 'advanced' : 'basic';
    } catch {
      return 'basic';
    }
  });

  const handleModeChange = (next: 'basic' | 'advanced') => {
    setMode(next);
    try {
      window.localStorage.setItem('apexretire-mode', next);
    } catch {
      // non-fatal
    }
  };

  // Load URL state if present, else restore the autosaved session.
  // Priority: shared link > saved session > defaults.
  useEffect(() => {
    let cancelled = false;
    // Async: the share payload may be deflate-compressed.
    decodeStateFromUrl().then((urlState) => {
      if (cancelled) return;
      if (urlState) {
        setState((prev) => sanitizeRetirementState({ ...prev, ...urlState }));
        setToastMessage('Loaded shared scenario from URL hash!');
        clearScenarioFromUrl();
        dirtyRef.current = true;
        return;
      }
      const saved = loadStateFromStorage();
      if (saved) {
        setState((prev) => sanitizeRetirementState({ ...prev, ...saved }));
        setToastMessage('Restored your last session from this browser.');
        dirtyRef.current = true;
      }
    });
    return () => {
      cancelled = true;
    };
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

  // Set when the user (or an import/preset/reset) changes inputs. The autosave
  // effect below only fires once dirty — without this, a fresh mount would
  // save pristine defaults over a good saved session before the load effect
  // applies (StrictMode double-mounts effects in dev, making the race certain).
  const dirtyRef = React.useRef(false);
  // Remembers the tax filing status chosen before a partner was enabled so it
  // can be restored when the partner is toggled off again.
  const filingBeforePartnerRef = React.useRef<string | null>(null);

  const handleChange = (updates: Partial<RetirementState>) => {
    dirtyRef.current = true;

    // Partner toggle bookkeeping: snapshot the pre-partner filing status when a
    // partner is enabled and force joint brackets; restore the snapshot (or
    // 'single') when the partner is disabled. This prevents headline drift
    // after an on->off toggle.
    let mergedUpdates: Partial<RetirementState> = { ...updates };
    const turningOn =
      updates.hasPartner === true || updates.partner?.enabled === true;
    const turningOff =
      updates.hasPartner === false || updates.partner?.enabled === false;
    if (turningOn && !turningOff) {
      if (filingBeforePartnerRef.current === null) {
        // state is the latest committed value at call time
        filingBeforePartnerRef.current = state.taxFilingStatus;
      }
      mergedUpdates = { ...mergedUpdates, taxFilingStatus: 'joint' };
    } else if (turningOff && !turningOn) {
      const restored = (filingBeforePartnerRef.current ?? 'single') as TaxFilingStatus;
      mergedUpdates = { ...mergedUpdates, taxFilingStatus: restored };
      filingBeforePartnerRef.current = null;
    }

    const hasSpendingStrategy = Object.prototype.hasOwnProperty.call(
      mergedUpdates,
      'spendingStrategy',
    );

    const apply = () => {
      setState((prev) => {
        const next = sanitizeRetirementState({ ...prev, ...mergedUpdates });
        const notice = describeClamp(mergedUpdates, next);
        if (notice) setToastMessage(notice);
        return next;
      });
    };

    if (hasSpendingStrategy) {
      startTransition(apply);
    } else {
      apply();
    }
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
      tax: open,
    });
  };

  const handleLoadScenarioState = (s: RetirementState) => {
    dirtyRef.current = true;
    setState(sanitizeRetirementState({ ...s }));
  };

  // Debounce the expensive 500-trial Monte Carlo sim so slider drags stay smooth.
  const debouncedState = useDebouncedValue(state, 150);

  // Autosave inputs locally so returning visits restore without import/export.
  // Quota/availability failures surface once instead of being silently lost.
  const quotaWarnedRef = React.useRef(false);
  useEffect(() => {
    if (!dirtyRef.current) return;
    try {
      saveStateToStorage(debouncedState);
      quotaWarnedRef.current = false;
    } catch {
      if (!quotaWarnedRef.current) {
        quotaWarnedRef.current = true;
        setToastMessage("Couldn't autosave (browser storage full or blocked). Use Export Inputs as a backup.");
      }
    }
  }, [debouncedState]);

  // Keyboard shortcuts: Alt+1..7 switch dashboard tabs, "?" toggles this help.
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === '?' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        setShowKeyboardHelp((prev) => !prev);
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= DASHBOARD_TABS.length) {
        e.preventDefault();
        setActiveTab(DASHBOARD_TABS[n - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Monte Carlo on a Web Worker -------------------------------------------
  // The deterministic projections are cheap and computed synchronously; the
  // 500-trial MC runs on a worker with a version token so stale responses are
  // ignored. Falls back to inline computation when workers are unavailable.
  const [mcSuccessRate, setMcSuccessRate] = useState<number | null>(null);
  const [workerAvailable, setWorkerAvailable] = useState(true);
  const workerRef = React.useRef<Worker | null>(null);
  const versionRef = React.useRef(0);

  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('./utils/mcWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<{ type: string; version: number; successRate: number }>) => {
        if (e.data?.type === 'result' && e.data.version === versionRef.current) {
          setMcSuccessRate(e.data.successRate);
        }
      };
      worker.onerror = () => {
        workerRef.current = null; // fall back to inline computation
        setWorkerAvailable(false);
        versionRef.current = 0;
      };
      workerRef.current = worker;
    } catch {
      workerRef.current = null;
      setWorkerAvailable(false);
    }
    return () => {
      worker?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (workerRef.current) {
      const version = ++versionRef.current;
      workerRef.current.postMessage({ type: 'simulate', version, state: debouncedState });
    }
  }, [debouncedState]);

  // The synchronous result deliberately runs with a single MC trial (the
  // worker supplies the statistically meaningful success rate).
  const simulationResultSync: SimulationResult = useMemo(() => {
    return runRetirementSimulation(debouncedState, { trials: 1 });
  }, [debouncedState]);

  const simulationResultInline: SimulationResult | null = useMemo(() => {
    if (workerAvailable && workerRef.current) return null;
    return runRetirementSimulation(debouncedState);
  }, [debouncedState, workerAvailable]);

  const simulationResult: SimulationResult =
    simulationResultInline ?? {
      ...simulationResultSync,
      successRate: mcSuccessRate ?? simulationResultSync.successRate,
    };

  const validationIssues = useMemo(() => validateRetirementState(state), [state]);

  const handleExportPdf = async () => {
    try {
      // pdfExport pulls in jsPDF (~350 kB) — load it only when the user asks.
      const { exportToPdf } = await import('./utils/pdfExport');
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
      dirtyRef.current = true;
      setState((prev) => sanitizeRetirementState({ ...prev, ...importedData }));
      setToastMessage('Successfully imported inputs from file!');
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Error reading import file.');
    }
    // Reset file input value so re-importing same file works
    e.target.value = '';
  };

  const handleLoadPreset = (presetName: string) => {
    dirtyRef.current = true;
    setState(applyPreset(DEFAULT_STATE, presetName));
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-slate-950 dark:text-slate-100 text-slate-900' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans transition-colors duration-300`}>
      <Header
        state={state}
        onExportPdf={handleExportPdf}
        onExportInputs={handleExportInputs}
        onImportInputs={handleImportInputs}
        onLoadPreset={handleLoadPreset}
        onResetDefault={() => {
          dirtyRef.current = true;
          setState(DEFAULT_STATE);
        }}
        onTriggerToast={(msg) => setToastMessage(msg)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        successRate={simulationResult.successRate}
      />

      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10">
        {isRecalculating && (
          <div role="status" aria-live="polite" className="text-xs dark:text-slate-400 text-slate-500 px-1">
            Recalculating…
          </div>
        )}
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
          {/* Left Column: Inputs (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 mb-1">
              <h2 className="text-xs font-extrabold uppercase tracking-wider dark:text-slate-400 text-slate-500 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" /> Plan Parameters
              </h2>

              <div className="flex items-center gap-3">
                {/* Basic / Advanced segmented toggle */}
                <div
                  className="flex items-center gap-1 text-xs font-bold p-1 rounded-xl border dark:bg-slate-900/80 bg-white dark:border-slate-800 border-slate-200"
                  role="group"
                  aria-label="Input mode"
                >
                  {(['basic', 'advanced'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={mode === m}
                      onClick={() => handleModeChange(m)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                        mode === m
                          ? 'bg-blue-600 text-white shadow-glow'
                          : 'dark:text-slate-400 text-slate-500 hover:text-slate-200 dark:hover:bg-slate-800/60 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {mode === 'advanced' && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAllSections(true)}
                      className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <ChevronDown className="w-3.5 h-3.5" /> Expand All
                    </button>
                    <span className="dark:text-slate-600 dark:text-slate-300 text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setAllSections(false)}
                      className="dark:text-slate-400 text-slate-500 hover:underline flex items-center gap-1 font-medium"
                    >
                      <ChevronUp className="w-3.5 h-3.5" /> Collapse All
                    </button>
                  </div>
                )}
              </div>
            </div>

            {mode === 'basic' ? (
              <BasicModeInputs
                state={state}
                onChange={handleChange}
                onSwitchToAdvanced={() => handleModeChange('advanced')}
              />
            ) : (
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

              <TaxStrategySection
                state={state}
                onChange={handleChange}
                isOpen={openSections.tax}
                onToggle={() => toggleSection('tax')}
              />
            </div>
            )}
          </div>

          {/* Right Column: Sticky Visual Anchor Pane (7 cols) */}
          <div className="lg:col-span-7 space-y-5 lg:sticky lg:top-20" id="dashboard-export-container">
            {/* Dashboard Tab Controls */}
            <div className="flex items-center justify-between dark:bg-slate-900/80 bg-white p-1.5 rounded-xl border dark:border-slate-800 border-slate-200 backdrop-blur-md">
              <div className="flex gap-1 text-xs" role="tablist" aria-label="Dashboard views">
                {DASHBOARD_TABS.map((tab, index) => (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[index] = el; }}
                    type="button"
                    role="tab"
                    title={`Alt+${index + 1}`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => {
                      let nextIndex: number;
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        nextIndex = (index + 1) % DASHBOARD_TABS.length;
                      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        nextIndex = (index - 1 + DASHBOARD_TABS.length) % DASHBOARD_TABS.length;
                      } else if (e.key === 'Home') {
                        nextIndex = 0;
                      } else if (e.key === 'End') {
                        nextIndex = DASHBOARD_TABS.length - 1;
                      } else {
                        return;
                      }
                      e.preventDefault();
                      const nextTab = DASHBOARD_TABS[nextIndex].id;
                      setActiveTab(nextTab);
                      tabRefs.current[nextIndex]?.focus();
                    }}
                    className={`px-3.5 py-2.5 min-h-[44px] rounded-lg font-bold transition-all ${activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-glow'
                        : 'dark:text-slate-400 text-slate-500 hover:text-slate-200 dark:hover:bg-slate-800/60 hover:bg-slate-100'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-[11px] dark:text-slate-400 text-slate-500 pr-2 hidden sm:block" aria-label={`Target: Age ${state.targetRetirementAge}`}>
                Target: <strong className="dark:text-slate-200 text-slate-800">Age {state.targetRetirementAge}</strong>
              </div>
            </div>

            {/* Active Dashboard Tab Content */}
            {activeTab === 'chart' && (
              <>
                <label className="flex items-center gap-2 text-xs dark:text-slate-400 text-slate-600 cursor-pointer select-none px-1">
                  <input
                    type="checkbox"
                    checked={showOverlays}
                    onChange={(e) => setShowOverlays(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  Overlay saved scenarios (up to 5)
                </label>
                <RetirementChart
                  yearlyProjections={simulationResult.yearlyProjections}
                  targetRetirementAge={state.targetRetirementAge}
                  onSelectSection={openSpecificSection}
                  overlayScenarios={overlayScenarios}
                  longevityProbabilities={simulationResult.longevityProbabilities}
                />
              </>
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

            {activeTab === 'compare' && <BenchmarkCompare state={state} />}

            {activeTab === 'scenarios' && (
              <ScenariosTab
                state={state}
                currentResult={simulationResult}
                onLoadState={handleLoadScenarioState}
                onTriggerToast={(msg) => setToastMessage(msg)}
              />
            )}

            {activeTab === 'sensitivity' && <SensitivityTab state={debouncedState} />}

            {activeTab === 'solve' && (
              <SolverTab
                state={state}
                baselineResult={simulationResult}
                onTriggerToast={(msg) => setToastMessage(msg)}
                onSelectRetirementAge={(age) => {
                  dirtyRef.current = true;
                  handleChange({ targetRetirementAge: age });
                  setToastMessage(`Retirement age set to ${age}`);
                }}
              />
            )}
          </div>
        </div>
      </main>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {showKeyboardHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div
            className="dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-700 border-slate-200 p-6 max-w-md w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider dark:text-slate-300 text-slate-600">
              Keyboard shortcuts
            </h3>
            <ul className="text-xs space-y-1.5 dark:text-slate-400 text-slate-600">
              <li><kbd className="px-1.5 py-0.5 dark:bg-slate-800 bg-slate-100 rounded">Alt</kbd> + <kbd className="px-1.5 py-0.5 dark:bg-slate-800 bg-slate-100 rounded">1–7</kbd> — switch dashboard view</li>
              <li><kbd className="px-1.5 py-0.5 dark:bg-slate-800 bg-slate-100 rounded">?</kbd> — toggle this help</li>
              <li><kbd className="px-1.5 py-0.5 dark:bg-slate-800 bg-slate-100 rounded">Esc</kbd> — close dialogs</li>
              <li>Arrow keys on sliders adjust their values</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowKeyboardHelp(false)}
              className="text-blue-400 hover:underline text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="border-t dark:border-slate-900 border-slate-200 dark:bg-slate-950 bg-white py-6 mt-12 text-center text-xs dark:text-slate-500 text-slate-500">
        ApexRetire Pro — Modern Financial Modeling Engine. Estimates only, not financial advice.
      </footer>
    </div>
  );
}

export default App;
