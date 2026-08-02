import React, { useState } from 'react';
import { Download, Share2, Sparkles, Check, RefreshCw, Sun, Moon } from 'lucide-react';
import { RetirementState } from '../types/retirement';
import { encodeStateToUrl } from '../utils/urlEncoder';

interface Props {
  onExportPdf: () => void;
  onLoadPreset: (presetName: string) => void;
  onResetDefault: () => void;
  state: RetirementState;
  onTriggerToast: (msg: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<Props> = ({
  onExportPdf,
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
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              ApexRetire <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">Pro</span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Interactive Progressive Disclosure Retirement & FIRE Simulator
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
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
            className="dark:bg-slate-900 bg-slate-100 dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 font-medium rounded-lg px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
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
            className="p-1.5 rounded-lg dark:bg-slate-900 bg-slate-100 dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 hover:text-blue-600 border transition-colors flex items-center gap-1 font-medium"
            title="Toggle Light / Dark Mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
            <span className="text-[11px] px-1">{isDark ? 'Dark' : 'Light'}</span>
          </button>

          {/* Share Scenario Button */}
          <button
            type="button"
            onClick={handleShareUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-slate-900 bg-slate-100 dark:text-slate-200 text-slate-700 font-medium border dark:border-slate-700 border-slate-300 hover:border-blue-500 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-blue-500" />}
            {copied ? 'URL Copied!' : 'Share Scenario'}
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={() => {
              onExportPdf();
              onTriggerToast('Generating Executive Summary PDF...');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-glow hover:opacity-95 transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            Export Summary PDF
          </button>

          {/* Reset Defaults */}
          <button
            type="button"
            onClick={() => {
              onResetDefault();
              onTriggerToast('Reset all parameters to default.');
            }}
            title="Reset Inputs"
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
