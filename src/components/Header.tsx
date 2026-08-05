import React, { useState } from 'react';
import { Download, Share2, Sparkles, Check, RefreshCw, Sun, Moon, FileDown, FileUp } from 'lucide-react';
import { RetirementState } from '../types/retirement';
import { encodeStateToUrl } from '../utils/urlEncoder';

interface Props {
  onExportPdf: () => void;
  onExportInputs: () => void;
  onImportInputs: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadPreset: (presetName: string) => void;
  onResetDefault: () => void;
  state: RetirementState;
  onTriggerToast: (msg: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<Props> = ({
  onExportPdf,
  onExportInputs,
  onImportInputs,
  onLoadPreset,
  onResetDefault,
  state,
  onTriggerToast,
  isDark,
  onToggleTheme,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareUrl = () => {
    const url = encodeStateToUrl(state);
    navigator.clipboard.writeText(url);
    setCopied(true);
    onTriggerToast('Copied shareable scenario URL to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4 sm:gap-6">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-glow shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              ApexRetire <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold tracking-wide">Pro</span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block mt-0.5 leading-relaxed">
              Interactive Progressive Disclosure Retirement & FIRE Simulator
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Preset Selector Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                onLoadPreset(e.target.value);
                const labels: Record<string, string> = {
                  tech_worker_sf: 'Tech Worker (SF → Portugal)',
                  family_texas: 'Young Family in Texas',
                  fire_early: 'Aggressive FIRE at Age 45',
                };
                onTriggerToast(`Applied ${labels[e.target.value] || 'Preset'} Scenario!`);
              }
            }}
            defaultValue=""
            className="dark:bg-slate-900 bg-slate-100 dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 font-medium rounded-xl px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors max-w-xs cursor-pointer"
          >
            <option value="" disabled>⚡ Load Preset Scenario</option>
            <option value="tech_worker_sf">Tech Worker (SF → Portugal)</option>
            <option value="family_texas">Young Family in Texas</option>
            <option value="fire_early">Aggressive FIRE at Age 45</option>
          </select>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-100 dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 hover:text-blue-600 border transition-colors flex items-center gap-1.5 font-medium shadow-sm"
            title="Toggle Light / Dark Mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-blue-500 shrink-0" />}
            <span className="text-xs px-0.5">{isDark ? 'Dark' : 'Light'}</span>
          </button>

          {/* Share Scenario Button */}
          <button
            type="button"
            onClick={handleShareUrl}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl dark:bg-slate-900 bg-slate-100 dark:text-slate-200 text-slate-700 font-medium border dark:border-slate-700 border-slate-300 hover:border-blue-500 transition-colors shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Share2 className="w-4 h-4 text-blue-500 shrink-0" />}
            <span>{copied ? 'URL Copied!' : 'Share Scenario'}</span>
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={() => {
              onExportPdf();
              onTriggerToast('Generating Executive Summary PDF...');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-glow hover:opacity-95 transition-opacity"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Export Summary PDF</span>
          </button>

          {/* Import / Export Inputs Dropdown or Buttons */}
          <button
            type="button"
            onClick={onExportInputs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-100 dark:text-slate-200 text-slate-700 font-medium border dark:border-slate-700 border-slate-300 hover:border-blue-500 transition-colors shadow-sm"
            title="Export all inputs to file"
          >
            <FileDown className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Export Inputs</span>
          </button>

          <label
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-100 dark:text-slate-200 text-slate-700 font-medium border dark:border-slate-700 border-slate-300 hover:border-blue-500 transition-colors shadow-sm cursor-pointer"
            title="Import inputs from file"
          >
            <FileUp className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Import Inputs</span>
            <input
              type="file"
              accept=".retire,.json,.txt"
              className="hidden"
              onChange={onImportInputs}
            />
          </label>

          {/* Reset Defaults */}
          <button
            type="button"
            onClick={() => {
              onResetDefault();
              onTriggerToast('Reset all parameters to default.');
            }}
            title="Reset Inputs"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-100 dark:text-slate-300 text-slate-700 font-medium border dark:border-slate-700 border-slate-300 hover:border-red-500/50 hover:text-red-400 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Reset Inputs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
