import React from 'react';
import { X, Printer, Download, Shield } from 'lucide-react';
import { Debate } from '../types';


interface PDFPreviewModalProps {
  debate: Debate;
  onClose: () => void;
}

export default function PDFPreviewModal({ debate, onClose }: PDFPreviewModalProps) {
  const handlePrint = () => window.print();

  const formatText = (text: string) => {
    if (!text) return null;
    const formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/gs, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gs, '<em>$1</em>')
      .replace(/&lt;thesis&gt;(.*?)&lt;\/thesis&gt;/gs, '<strong class="thesis-highlight">$1</strong>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const officialVerdict = debate.judge_verdicts?.find(jv => jv.persona === 'single_judge');
  const winnerLabel = debate.winning_side === 'for' ? 'SIDE A (FOR THE MOTION)' : 'SIDE B (AGAINST THE MOTION)';

  return (
    <>
      {/* ── Print Styles ──────────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 18mm 16mm 20mm 16mm;
          }

          /* Ensure global ancestors don't restrict print height to 1 page */
          html, body, #root, #debate-arena-app {
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            position: static !important;
          }

          /* Hide everything except our modal content */
          body * { visibility: hidden !important; }
          #pdf-preview-modal-overlay,
          #pdf-preview-modal-overlay * { visibility: visible !important; }

          /* Reset overlay to flow naturally */
          #pdf-preview-modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: transparent !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Hide screen-only controls */
          .print-hide { display: none !important; }

          /* The document wrapper must be static so it flows */
          #pdf-document-paper {
            position: static !important;
            display: block !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 12mm 0 !important;
            background: white !important;
            color: #1c1b19 !important;
          }

          /* Each pdf-page block maps to exactly one printed page */
          .pdf-page {
            display: block !important;
            position: relative !important;
            overflow: visible !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          /* The LAST page must NOT add a blank extra page after it */
          .pdf-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Arguments avoid splitting mid-paragraph */
          .argument-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 10pt !important;
          }

          /* Running footer visible on print */
          .page-footer {
            display: flex !important;
          }
        }

        @media screen {
          .page-footer { display: none; }
        }

        /* Print typography */
        .pdf-body {
          font-family: 'Georgia', 'Times New Roman', serif;
          color: #1c1b19;
          line-height: 1.6;
        }
        .pdf-mono { font-family: 'Courier New', monospace; }
        .thesis-highlight { font-style: italic; font-weight: 600; }
      `}</style>

      {/* ── Screen Overlay ─────────────────────────────────────────────── */}
      <div
        id="pdf-preview-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        {/* Modal Shell */}
        <div
          id="pdf-preview-modal"
          className="w-full max-w-4xl h-[92vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-zinc-800 print-hide"
          style={{ backgroundColor: '#09090b' }}
        >
          {/* ── Controls Bar ── */}
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-zinc-100">
              <Shield className="w-5 h-5 text-blue-400" />
              <h2 className="font-sans text-sm font-bold">Official Document Export Preview</h2>
              <span className="ml-2 font-mono text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                Multi-page supported
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="pdf-print-btn"
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Record
              </button>
              <button
                id="pdf-download-btn"
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
              <button
                id="close-pdf-preview-btn"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Scrollable Preview ── */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-zinc-900/60 flex justify-center">
            <DocumentContent debate={debate} winnerLabel={winnerLabel} officialVerdict={officialVerdict} formatText={formatText} />
          </div>
        </div>

        {/* ── Print-only full document (sits outside scrollable box) ── */}
        <div id="pdf-document-paper" className="hidden print:block pdf-body">
          <DocumentContent debate={debate} winnerLabel={winnerLabel} officialVerdict={officialVerdict} formatText={formatText} />
        </div>
      </div>
    </>
  );
}

/** Shared document content rendered for both screen preview and print */
function DocumentContent({ debate, winnerLabel, officialVerdict, formatText }: {
  debate: Debate;
  winnerLabel: string;
  officialVerdict: any;
  formatText: (t: string) => React.ReactNode;
}) {
  const forTurns  = debate.turns?.filter(t => t.side === 'for')     || [];
  const agTurns   = debate.turns?.filter(t => t.side === 'against') || [];

  return (
    <div className="w-full max-w-3xl pdf-body">

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 1 — Court Header + Case Summary + Counsels + Transcript
      ════════════════════════════════════════════════════════════════ */}
      <div className="pdf-page bg-[#F8F6F1] text-[#1C1B19] shadow-2xl p-10 md:p-12 border border-neutral-300">

        {/* Court Seal & Header */}
        <div className="text-center space-y-1 border-b-2 border-double border-neutral-800 pb-5 mb-6">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full border-2 border-neutral-800 flex items-center justify-center font-serif text-lg font-extrabold text-neutral-800 shadow">
              DA
            </div>
          </div>
          <h1 className="font-serif text-lg font-extrabold tracking-widest text-neutral-800 uppercase">
            Debate Arena — Official Transcript
          </h1>
          <p className="font-sans text-[9px] tracking-widest text-gray-500 uppercase font-semibold">
            AI-Powered Multi-Agent Judicial Deliberation System
          </p>
          <p className="pdf-mono text-[9px] text-gray-500 mt-1">
            CASE NO: DA-{debate.id.slice(0, 8).toUpperCase()} &nbsp;•&nbsp; {new Date(debate.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Case Summary Box */}
        <div className="grid grid-cols-2 gap-4 text-xs font-serif bg-neutral-100 p-4 border border-neutral-300 mb-5">
          <div>
            <span className="font-bold uppercase tracking-wider block text-[8px] text-gray-500 pdf-mono mb-1">MOTION RESOLVED:</span>
            <p className="font-extrabold text-neutral-800 leading-snug break-words text-sm">
              &ldquo;{debate.question}&rdquo;
            </p>
          </div>
          <div className="space-y-2 pl-4 border-l border-neutral-300">
            <div>
              <span className="font-bold uppercase tracking-wider block text-[8px] text-gray-500 pdf-mono">TRIAL DATE:</span>
              <p className="mt-0.5 font-semibold text-[11px]">{new Date(debate.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider block text-[8px] text-gray-500 pdf-mono">PRESIDING MAGISTRATE:</span>
              <p className="mt-0.5 font-bold text-[11px]">{debate.model_judge}</p>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider block text-[8px] text-gray-500 pdf-mono">FINAL VERDICT:</span>
              <p className="mt-0.5 font-black text-neutral-900 text-[11px]">{winnerLabel}</p>
            </div>
          </div>
        </div>

        {/* Counsels Table */}
        <div className="mb-5 text-xs font-serif">
          <h3 className="font-serif text-[9px] font-black uppercase tracking-widest border-b border-neutral-400 pb-1 text-neutral-800 mb-2">
            COUNSELS OF RECORD
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neutral-200 text-[8px] pdf-mono uppercase text-gray-600">
                <th className="p-1.5 text-left border border-neutral-300">Side</th>
                <th className="p-1.5 text-left border border-neutral-300">Model / Agent</th>
                <th className="p-1.5 text-center border border-neutral-300">Rounds</th>
                <th className="p-1.5 text-center border border-neutral-300">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-[10px]">
                <td className="p-1.5 border border-neutral-300 font-bold">FOR THE MOTION (Side A)</td>
                <td className="p-1.5 border border-neutral-300">{debate.model_for}</td>
                <td className="p-1.5 border border-neutral-300 text-center">{forTurns.length}</td>
                <td className="p-1.5 border border-neutral-300 text-center pdf-mono font-bold">
                  {forTurns.length > 0 ? (forTurns.reduce((s, t) => s + (t.strength_score || 0), 0) / forTurns.length).toFixed(1) : '—'}/10
                </td>
              </tr>
              <tr className="text-[10px] bg-neutral-50">
                <td className="p-1.5 border border-neutral-300 font-bold">AGAINST THE MOTION (Side B)</td>
                <td className="p-1.5 border border-neutral-300">{debate.model_against}</td>
                <td className="p-1.5 border border-neutral-300 text-center">{agTurns.length}</td>
                <td className="p-1.5 border border-neutral-300 text-center pdf-mono font-bold">
                  {agTurns.length > 0 ? (agTurns.reduce((s, t) => s + (t.strength_score || 0), 0) / agTurns.length).toFixed(1) : '—'}/10
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION I — Argument Transcript */}
        <div className="space-y-2">
          <h3 className="font-serif text-[9px] font-black uppercase tracking-widest border-b border-neutral-400 pb-1 text-neutral-800 mb-2">
            SECTION I — RECORD OF VERBAL ARGUMENTS
          </h3>
          {debate.turns?.map((turn) => (
            <div key={turn.id} className="argument-block">
              <div className="flex justify-between items-center pdf-mono text-[8px] text-gray-500 border-b border-dashed border-neutral-300 pb-0.5 mb-1">
                <span className="font-bold text-neutral-700">
                  [{turn.side === 'for' ? 'A' : 'B'}] {turn.side === 'for' ? 'FOR THE MOTION' : 'AGAINST THE MOTION'} &nbsp;—&nbsp;
                  {turn.side === 'for' ? debate.model_for : debate.model_against}
                </span>
                <span>ROUND {turn.round_number} &nbsp;|&nbsp; SCORE {turn.strength_score}/10</span>
              </div>
              <p className="pl-3 border-l-2 border-neutral-400 py-1 italic bg-white/60 text-neutral-800 text-[10px] leading-relaxed break-words">
                &ldquo;{formatText(turn.content)}&rdquo;
              </p>
            </div>
          ))}
        </div>

        {/* Page 1 Footer strip */}
        <div className="mt-8 pt-3 border-t border-neutral-300 flex justify-between items-center">
          <p className="pdf-mono text-[7px] text-gray-400">DEBATE ARENA — OFFICIAL TRANSCRIPT &nbsp;|&nbsp; PAGE 1 OF 2</p>
          <p className="pdf-mono text-[7px] text-gray-400">CASE: DA-{debate.id.slice(0,8).toUpperCase()}</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 2 — SECTION II Final Judgment + Certificate
      ════════════════════════════════════════════════════════════════ */}
      <div className="pdf-page bg-[#F8F6F1] text-[#1C1B19] shadow-2xl p-10 md:p-12 border border-neutral-300 mt-8 print:mt-0 flex flex-col">

        {/* Page 2 running header */}
        <div className="flex justify-between items-center border-b border-neutral-300 pb-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full border border-neutral-800 flex items-center justify-center font-serif text-xs font-extrabold text-neutral-800">
              DA
            </div>
            <span className="font-serif text-[10px] font-bold text-neutral-700 uppercase tracking-widest">Debate Arena — Official Transcript</span>
          </div>
          <span className="pdf-mono text-[8px] text-gray-500">CASE: DA-{debate.id.slice(0,8).toUpperCase()}</span>
        </div>

        {/* SECTION II — Judgment */}
        <div className="space-y-4 flex-1">
          <h3 className="font-serif text-[10px] font-black uppercase tracking-widest border-b-2 border-neutral-800 pb-1 text-neutral-800">
            SECTION II — FINAL JUDICIAL OPINION &amp; DECREE
          </h3>

          {/* Verdict Banner */}
          <div className="bg-neutral-900 text-white p-5 text-center space-y-1.5">
            <p className="pdf-mono text-[8px] uppercase tracking-widest text-gray-400">OFFICIAL JUDICIAL DECREE</p>
            <h2 className="font-serif text-xl font-extrabold tracking-wide">{winnerLabel}</h2>
            <p className="text-[10px] text-gray-300 font-serif italic">as ruled by the presiding magistrate: {debate.model_judge}</p>
          </div>

          {/* Full Reasoning */}
          <div>
            <p className="pdf-mono text-[8px] uppercase tracking-widest text-gray-500 font-bold mb-2">JUDICIAL REASONING:</p>
            <div className="font-serif text-[11px] text-neutral-800 leading-relaxed whitespace-pre-wrap pl-4 border-l-4 border-[#B8902F] bg-[#B8902F]/5 p-4 break-words">
              {formatText(officialVerdict?.reasoning || debate.judge_verdicts?.[0]?.reasoning || 'No judicial opinion recorded.')}
            </div>
          </div>
        </div>

        {/* Certificate Footer */}
        <div className="border-t-2 border-double border-neutral-800 pt-5 mt-10 flex items-end justify-between text-[9px] font-serif">
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-wider text-neutral-700 pdf-mono text-[7px]">DOCUMENT VERIFICATION</p>
            <p className="text-gray-500 pdf-mono text-[7px]">HASH: SHA256.{debate.id.toUpperCase()}</p>
            <p className="text-gray-500 pdf-mono text-[7px]">PLATFORM: DEBATE ARENA v2 — INTERNATIONAL RESEARCH EDITION</p>
            <p className="text-gray-500 pdf-mono text-[7px]">GENERATED: {new Date().toISOString()}</p>
            <p className="pdf-mono text-[7px] text-gray-400">PAGE 2 OF 2</p>
          </div>
          <div className="text-right space-y-1.5">
            <div className="font-serif italic font-extrabold text-neutral-800">{debate.model_judge}</div>
            <div className="w-44 h-px bg-neutral-800 ml-auto" />
            <p className="pdf-mono text-[7px] text-gray-500 uppercase tracking-wider">PRESIDING CHIEF JUSTICE</p>
            <p className="pdf-mono text-[7px] text-gray-500 uppercase">DEBATE ARENA JUDICIAL PANEL</p>
          </div>
        </div>
      </div>
    </div>
  );
}
