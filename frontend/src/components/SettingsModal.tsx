/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Check, Brain, Sliders, Volume2, Shield } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rounds: number;
  setRounds: (rounds: number) => void;
  tone: 'formal' | 'casual' | 'courtroom';
  setTone: (tone: 'formal' | 'casual' | 'courtroom') => void;
  modelFor: string;
  setModelFor: (model: string) => void;
  modelAgainst: string;
  setModelAgainst: (model: string) => void;
  modelJudge: string;
  setModelJudge: (model: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  rounds,
  setRounds,
  tone,
  setTone,
  modelFor,
  setModelFor,
  modelAgainst,
  setModelAgainst,
  modelJudge,
  setModelJudge,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const modelOptions = [
    'Gemini 3.1 Flash Lite',
    'Gemini 2.5 Flash'
  ];

  return (
    <div 
      id="settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
    >
      <div 
        id="settings-modal-content"
        className="w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-zinc-800"
        style={{ backgroundColor: '#09090b' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-850 bg-zinc-950">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="font-sans text-sm font-bold text-zinc-100">Orchestrator Settings</h2>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Contents */}
        <div className="p-6 overflow-y-auto space-y-6 bg-zinc-900/40">
          {/* Rounds Selection */}
          <div className="space-y-3">
            <label className="block font-sans text-xs font-bold uppercase tracking-wider text-zinc-400">
              Debate Rounds (Complexity)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 3, 5].map((r) => (
                <button
                  key={r}
                  id={`rounds-select-${r}`}
                  onClick={() => setRounds(r)}
                  className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    rounds === r
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-transparent text-white shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="font-mono text-lg font-bold">{r}</span>
                  <span className="font-sans text-[10px] uppercase tracking-wider opacity-80 mt-0.5">
                    {r === 1 ? 'Quick Match' : r === 3 ? 'Standard' : 'Extended'}
                  </span>
                </button>
              ))}
            </div>
            <p className="font-sans text-xs text-zinc-500 leading-normal">
              Select the maximum rounds of interaction. More rounds provide deeper analysis, but take longer to generate.
            </p>
          </div>

          {/* Tone Selection */}
          <div className="space-y-3">
            <label className="block font-sans text-xs font-bold uppercase tracking-wider text-zinc-400">
              Vocal Tone & Personality
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['formal', 'casual', 'courtroom'] as const).map((t) => (
                <button
                  key={t}
                  id={`tone-select-${t}`}
                  onClick={() => setTone(t)}
                  className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center transition-all text-center cursor-pointer ${
                    tone === t
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-transparent text-white shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="capitalize font-sans text-sm font-bold">{t}</span>
                  <span className="font-sans text-[9px] uppercase tracking-wider opacity-80 mt-1">
                    {t === 'formal' ? 'Academic/Polite' : t === 'casual' ? 'Sassy/Modern' : 'Legal/Strict'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Assignments */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-zinc-400">Model Matrix Selection</span>
            </div>

            <div className="space-y-3">
              {/* Model FOR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="font-sans text-xs font-semibold text-zinc-300">Side A (FOR) LLM</span>
                </div>
                <select
                  id="select-model-for"
                  value={modelFor}
                  onChange={(e) => setModelFor(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-zinc-800 bg-zinc-900 text-zinc-100 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {modelOptions.map((opt) => (
                    <option key={opt} value={opt} className="bg-zinc-950 text-zinc-100">{opt}</option>
                  ))}
                </select>
              </div>

              {/* Model AGAINST */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="font-sans text-xs font-semibold text-zinc-300">Side B (AGAINST) LLM</span>
                </div>
                <select
                  id="select-model-against"
                  value={modelAgainst}
                  onChange={(e) => setModelAgainst(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-zinc-800 bg-zinc-900 text-zinc-100 outline-none focus:border-purple-500 cursor-pointer"
                >
                  {modelOptions.map((opt) => (
                    <option key={opt} value={opt} className="bg-zinc-950 text-zinc-100">{opt}</option>
                  ))}
                </select>
              </div>

              {/* Model JUDGE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-sans text-xs font-semibold text-zinc-300">Court Judge LLM</span>
                </div>
                <select
                  id="select-model-judge"
                  value={modelJudge}
                  onChange={(e) => setModelJudge(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-zinc-800 bg-zinc-900 text-zinc-100 outline-none focus:border-amber-400 cursor-pointer"
                >
                  {modelOptions.map((opt) => (
                    <option key={opt} value={opt} className="bg-zinc-950 text-zinc-100">{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-850 bg-zinc-950 flex justify-end">
          <button
            id="apply-settings-btn"
            onClick={onClose}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl py-2 px-5 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.25)]"
          >
            <Check className="w-4 h-4" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
