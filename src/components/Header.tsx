import React, { useState } from 'react';
import { Download, Share2, Sparkles, Check, RefreshCw } from 'lucide-react';
import { RetirementState } from '../types/retirement';
import { encodeStateToUrl } from '../utils/urlEncoder';

interface Props {
  onExportPdf: () => void;
  onLoadPreset: (presetName: string) => void;
  onResetDefault: () => void;
  state: RetirementState;
}

export const Header: React.FC<Props> = ({
  onExportPdf,
  onLoadPreset,
  onResetDefault,
  state,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareUrl = () => {
    const url = encodeStateToUrl(state);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
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
              if (e.target.value) onLoadPreset(e.target.value);
            }}
            defaultValue=""
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
          >
            <option value="" disabled>⚡ Load Preset Scenario</option>
            <option value="tech_worker_sf">Tech Worker (SF → Portugal)</option>
            <option value="family_texas">Young Family in Texas</option>
            <option value="fire_early">Aggressive FIRE at Age 45</option>
          </select>

          {/* Share Scenario Button */}
          <button
            type="button"
            onClick={handleShareUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-blue-400" />}
            {copied ? 'URL Copied!' : 'Share Scenario'}
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-glow hover:opacity-95 transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            Export Summary PDF
          </button>

          {/* Reset Defaults */}
          <button
            type="button"
            onClick={onResetDefault}
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
