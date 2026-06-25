/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Award, Download, ArrowRight, RefreshCw, MessageSquare, 
  ThumbsUp, ThumbsDown, AlertCircle, FileText, Sparkles, ChevronRight, Scale,
  GraduationCap, SearchCheck, BookOpen, Sun, Heart, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Debate } from '../types';
import PDFPreviewModal from './PDFPreviewModal';
import { api } from '../services/api';

interface VerdictViewProps {
  debate: Debate;
  onStartNewDebate: () => void;
  onStartChainedDebate: (newQuestion: string) => void;
}

interface ParsedVerdict {
  winningStance: string;
  bullets: { keyword: string; text: string }[];
}

function parseReasoning(reasoning: string, question: string): ParsedVerdict {
  if (!reasoning) return { winningStance: '', bullets: [] };
  
  const lines = reasoning.split('\n').map(l => l.trim()).filter(Boolean);
  let winningStance = '';
  const bullets: { keyword: string; text: string }[] = [];
  
  for (const line of lines) {
    if (line.toUpperCase().startsWith('WINNING STANCE:')) {
      winningStance = line.replace(/^WINNING STANCE:\s*/i, '').trim();
    } else if (line.startsWith('*') || line.startsWith('-') || /^\d+\./.test(line)) {
      const cleanLine = line.replace(/^([\*\-]\s*|\d+\.\s*)/, '').trim();
      const match = cleanLine.match(/^\*\*(.*?)\*\*[:\s]*(.*)$/);
      if (match) {
        bullets.push({ keyword: match[1].trim(), text: match[2].trim() });
      } else {
        bullets.push({ keyword: '', text: cleanLine });
      }
    } else if (line.toUpperCase().startsWith('WINNER:')) {
      continue;
    } else {
      if (!winningStance && !bullets.length) {
        winningStance = line;
      }
    }
  }
  
  if (bullets.length === 0) {
    const rawStance = winningStance || reasoning;
    const sentences = rawStance
      .replace(/^WINNING STANCE:\s*/i, '')
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s && !s.toUpperCase().includes('WINNER:'));
      
    if (sentences.length > 1) {
      winningStance = sentences[0];
      for (let i = 1; i < sentences.length; i++) {
        const sentence = sentences[i];
        const words = sentence.split(' ');
        const keyword = words.slice(0, 2).join(' ').replace(/[^a-zA-Z0-9\s]/g, '');
        const rest = words.slice(2).join(' ');
        bullets.push({ keyword, text: rest || sentence });
      }
    } else if (sentences.length === 1) {
      winningStance = sentences[0];
    }
  }
  
  if (!winningStance) {
    winningStance = question;
  }
  
  return { winningStance, bullets };
}

function CountUp({ target, duration = 800 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(1)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return <>{value}</>;
}

export default function VerdictView({
  debate: initialDebate,
  onStartNewDebate,
  onStartChainedDebate
}: VerdictViewProps) {
  const [activeTab, setActiveTab] = useState<'verdict' | 'personas' | 'bias' | 'autopsy' | 'transcript'>('verdict');
  const [isAuditing, setIsAuditing] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [fullDebate, setFullDebate] = useState<Debate>(initialDebate);
  const [auditResult, setAuditResult] = useState(initialDebate.bias_report || null);

  // Poll for Autopsy and Persona data if not present yet
  useEffect(() => {
    let intervalId: any;
    
    const fetchDebate = async () => {
      try {
        const data = await api.getDebate(fullDebate.id);
        setFullDebate(data);
        if (data.bias_report) {
          setAuditResult(data.bias_report);
        }
        // Stop polling once we have the autopsy and persona votes
        if (data.autopsy && data.persona_votes && data.persona_votes.length > 0) {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Failed to fetch updated debate data", err);
      }
    };

    fetchDebate(); // Initial fetch
    
    // Set up polling if data is missing
    if (!fullDebate.autopsy || !fullDebate.persona_votes || fullDebate.persona_votes.length === 0) {
      intervalId = setInterval(fetchDebate, 2500);
    }
    
    return () => clearInterval(intervalId);
  }, [fullDebate.id]);

  const officialVerdict = fullDebate.judge_verdicts.find(jv => jv.persona === 'single_judge');
  const winnerColor = fullDebate.winning_side === 'for' ? '#3b82f6' : '#8b5cf6';
  const winnerLabel = fullDebate.winning_side === 'for' ? 'SIDE A (FOR)' : 'SIDE B (AGAINST)';

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const report = await api.runBiasCheck(fullDebate.id);
      setAuditResult(report);
    } catch (err) {
      console.error('Bias audit failed:', err);
      setAuditResult({
        id: `br-error-${Math.random()}`,
        debate_id: fullDebate.id,
        original_winner: fullDebate.winning_side || 'against',
        swapped_winner: fullDebate.winning_side || 'against',
        bias_detected: false,
        explanation: 'Audit could not be completed. The backend may be unavailable or rate-limited. Please try again later.'
      });
    } finally {
      setIsAuditing(false);
    }
  };

  // Dynamic chained debate suggestions via Gemini
  const [chainedSuggestions, setChainedSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  useEffect(() => {
    if (fullDebate.status !== 'complete') return;
    
    let cancelled = false;
    setIsLoadingSuggestions(true);
    
    api.getChainedSuggestions(fullDebate.id).then(suggestions => {
      if (!cancelled) {
        if (suggestions.length > 0) {
          setChainedSuggestions(suggestions);
        } else {
          // Fallback suggestions if API fails
          setChainedSuggestions([
            `Should the conclusions from this debate be applied as policy?`,
            `Does the losing side's argument hold under different conditions?`,
            `What ethical constraints should limit the winning stance?`
          ]);
        }
        setIsLoadingSuggestions(false);
      }
    });
    
    return () => { cancelled = true; };
  }, [fullDebate.id, fullDebate.status]);

  // Parse thesis tags for transcript rendering
  const renderTurnContent = (content: string) => {
    const thesisMatch = content.match(/<thesis>([\s\S]*?)<\/thesis>/i);
    if (thesisMatch) {
      const thesis = thesisMatch[1];
      const before = content.split(/<thesis>/i)[0];
      const after = content.split(/<\/thesis>/i)[1];
      return (
        <>
          {before}
          <strong className="text-lg font-black text-white px-1 leading-snug block my-3 border-l-2 border-current pl-3">{thesis}</strong>
          {after}
        </>
      );
    }
    
    // Fallback: bold first sentence
    const firstPunctuation = content.search(/[.!?]/);
    if (firstPunctuation !== -1) {
      const firstSentence = content.substring(0, firstPunctuation + 1);
      const rest = content.substring(firstPunctuation + 1);
      return (
        <>
          <strong className="text-lg font-bold text-white block mb-2">{firstSentence}</strong>
          {rest}
        </>
      );
    }
    
    return content;
  };

  return (
    <div id="verdict-screen-container" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 select-none bg-[#09090b]">
      
      {/* Top Banner & Winner Indicator */}
      <motion.div 
        id="winner-banner-panel"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-900/80 border-zinc-800"
        style={{ 
          borderColor: winnerColor,
          borderWidth: '2px',
          boxShadow: `0 10px 30px -10px ${fullDebate.winning_side === 'for' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)'}`
        }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="h-16 w-16 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg"
            style={{ backgroundColor: winnerColor }}
          >
            <Award className="w-8 h-8 animate-bounce" />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Official Court Ruling</span>
            <h1 className="font-sans text-2xl md:text-3xl font-black text-zinc-100 mt-1">
              WINNER: <span className="text-[#D4AF37]">{winnerLabel}</span>
            </h1>
            <p className="font-sans text-xs text-zinc-400 mt-1 max-w-xl">
              &ldquo;{fullDebate.question}&rdquo;
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0 w-full md:w-auto justify-end">
          <button
            id="export-pdf-btn"
            onClick={() => setShowPdfPreview(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Transcript (PDF)
          </button>
          
          <button
            id="verdict-new-debate-btn"
            onClick={onStartNewDebate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Start New Debate
          </button>
        </div>
      </motion.div>

      {/* Tabs Navigation (Segmented Control style) */}
      <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 max-w-md">
        {(['verdict', 'transcript'] as const).map((tab) => (
          <button
            key={tab}
            id={`verdict-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition-all cursor-pointer ${
              activeTab === tab 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {tab === 'verdict' ? 'Judge Opinion' : 'Transcript'}
          </button>
        ))}
      </div>

      {/* Main Tab Panel Display */}
      <div id="verdict-tab-panel" className="bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-800 p-6 min-h-[300px]">
        <AnimatePresence mode="wait">
          
          {/* JUDGE OPINION TAB */}
          {activeTab === 'verdict' && (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="font-sans text-lg font-bold text-zinc-100">Judicial Opinion & Decree</h3>
                <span className="font-mono text-[9px] bg-zinc-950 text-zinc-500 border border-zinc-850 px-2 py-0.5 rounded ml-auto">
                  Authored by {fullDebate.model_judge}
                </span>
              </div>

              {officialVerdict ? (() => {
                const { winningStance, bullets } = parseReasoning(officialVerdict.reasoning, fullDebate.question);
                const sizeClasses = ['text-sm md:text-base font-medium', 'text-base md:text-lg font-semibold', 'text-lg md:text-xl font-bold'];
                
                return (
                  <div className="space-y-6">
                    <div className="text-center py-6 px-4 md:p-8 bg-zinc-950/40 rounded-2xl border border-zinc-800/80 shadow-inner flex flex-col items-center justify-center space-y-2">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Winning Verdict Thesis</span>
                      <h2 className="font-sans text-xl md:text-2xl font-black text-white leading-normal tracking-tight max-w-xl">
                        &ldquo;{winningStance}&rdquo;
                      </h2>
                    </div>

                    {bullets.length > 0 ? (
                      <div className="space-y-4">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Key Opinion Points</span>
                        <ul className="space-y-4">
                          {bullets.map((bullet, idx) => (
                            <motion.li 
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.15 }}
                              className={`flex items-start gap-3 p-4 rounded-xl bg-zinc-950/20 border border-zinc-850 hover:border-zinc-800 transition-colors ${sizeClasses[idx] || 'text-sm'}`}
                            >
                              <span 
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white font-mono text-xs font-black shadow-md"
                                style={{ backgroundColor: winnerColor }}
                              >
                                {idx + 1}
                              </span>
                              <div className="leading-relaxed">
                                {bullet.keyword && (
                                  <strong className="font-extrabold mr-2 select-text" style={{ color: winnerColor }}>
                                    {bullet.keyword}:
                                  </strong>
                                )}
                                <span className="text-zinc-200 select-text">{bullet.text}</span>
                              </div>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="font-sans text-base text-zinc-350 leading-relaxed whitespace-pre-wrap select-text">
                        {officialVerdict.reasoning}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <p className="text-sm text-zinc-500 italic">No formal reasoning generated.</p>
              )}
            </motion.div>
          )}

          {/* MULTI-PERSONA AUDIENCE VOTES TAB */}
          {activeTab === 'personas' && (
            <motion.div
              key="personas"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Scale className="w-5 h-5 text-purple-400" />
                <h3 className="font-sans text-lg font-bold text-zinc-100">Audience / Multi-Perspective Jury</h3>
              </div>

              {(!fullDebate.persona_votes || fullDebate.persona_votes.length === 0) ? (
                <div className="space-y-6 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mb-4"></div>
                  <div className="flex h-12 bg-zinc-800 rounded-xl w-full mb-6"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="h-40 bg-zinc-900 rounded-xl border border-zinc-800 shimmer"></div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    const votesFor = fullDebate.persona_votes.filter(v => v.voted_side === 'for').length;
                    const votesAgainst = fullDebate.persona_votes.filter(v => v.voted_side === 'against').length;
                    const forPct = (votesFor / 5) * 100;
                    
                    let consensusMsg = '';
                    if (votesFor === 5 || votesAgainst === 5) consensusMsg = 'Unanimous Agreement across all personas.';
                    else if (fullDebate.winning_side === 'for' && votesFor < votesAgainst) consensusMsg = 'Jury contradicts the Judge! The audience favored Side B.';
                    else if (fullDebate.winning_side === 'against' && votesAgainst < votesFor) consensusMsg = 'Jury contradicts the Judge! The audience favored Side A.';
                    else consensusMsg = `Split decision leaning ${votesFor > votesAgainst ? 'Side A' : 'Side B'}.`;

                    const icons: Record<string, any> = {
                      Student: <GraduationCap className="w-4 h-4" />,
                      Skeptic: <SearchCheck className="w-4 h-4" />,
                      Professor: <BookOpen className="w-4 h-4" />,
                      Optimist: <Sun className="w-4 h-4" />,
                      Parent: <Heart className="w-4 h-4" />
                    };

                    return (
                      <div className="space-y-6">
                        {/* Summary Bar */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-blue-400">Side A ({votesFor} votes)</span>
                            <span className="text-xs font-bold text-purple-400">Side B ({votesAgainst} votes)</span>
                          </div>
                          <div className="w-full h-4 rounded-full overflow-hidden flex">
                            <div style={{ width: `${forPct}%` }} className="h-full bg-blue-500 transition-all duration-1000"></div>
                            <div style={{ width: `${100 - forPct}%` }} className="h-full bg-purple-500 transition-all duration-1000"></div>
                          </div>
                          <div className="mt-3 text-center">
                            <span className="inline-block bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800 text-xs text-zinc-300 font-medium">
                              {consensusMsg}
                            </span>
                          </div>
                        </div>

                        {/* Persona Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          {fullDebate.persona_votes.map((vote) => {
                            const sideColor = vote.voted_side === 'for' ? '#3b82f6' : '#8b5cf6';
                            const Icon = icons[vote.persona_name] || <MessageSquare className="w-4 h-4" />;
                            
                            return (
                              <div 
                                key={vote.id}
                                className="rounded-xl border bg-zinc-950 flex flex-col overflow-hidden shadow-md"
                                style={{ borderLeftWidth: '4px', borderLeftColor: sideColor, borderColor: 'rgba(255,255,255,0.05)' }}
                              >
                                <div className="p-3 bg-zinc-900/50 flex justify-between items-center border-b border-zinc-800/50">
                                  <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-xs">
                                    {Icon}
                                    {vote.persona_name}
                                  </div>
                                  <span 
                                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                                    style={{ backgroundColor: `${sideColor}20`, color: sideColor }}
                                  >
                                    {vote.voted_side === 'for' ? 'Side A' : 'Side B'}
                                  </span>
                                </div>
                                <div className="p-4 flex-1">
                                  <p className="text-xs text-zinc-400 leading-relaxed italic">"{vote.reasoning}"</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </motion.div>
          )}

          {/* BIAS AUDIT REPORT TAB */}
          {activeTab === 'bias' && (
            <motion.div
              key="bias"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6 max-w-2xl"
            >
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-sans text-lg font-bold text-zinc-100">Order-Swap Bias Auditor</h3>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Large Language Models often suffer from <strong>recency</strong> or <strong>primacy bias</strong> (favoring the speaker who spoke last or first, respectively). The Bias Auditor re-runs the entire debate sequence with the presentation order inverted, then verifies if the judge's verdict flips.
                </p>

                {auditResult ? (
                  <div className="space-y-4">
                    {/* Status Header */}
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${auditResult.bias_detected ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                      <Shield className={`w-6 h-6 mt-0.5 shrink-0 ${auditResult.bias_detected ? 'text-rose-400' : 'text-emerald-400'}`} />
                      <div>
                        <h4 className="font-sans text-base font-bold text-zinc-100">
                          {auditResult.bias_detected ? '⚠ Positional Bias Detected' : '✓ Verdict Integrity Verified'}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                          Confidence: {auditResult.bias_detected ? 'LOW — requires re-evaluation' : 'HIGH — structurally sound'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Structured Analysis Sections */}
                    {(() => {
                      const explanation = auditResult.explanation || '';
                      const sections = explanation.split(/(METHODOLOGY:|FINDING:|CONCLUSION:)/gi).filter(Boolean);
                      const parsed: { title: string; content: string }[] = [];
                      
                      for (let i = 0; i < sections.length; i += 2) {
                        const title = sections[i]?.replace(':', '').trim();
                        const content = sections[i + 1]?.trim();
                        if (title && content) {
                          parsed.push({ title, content });
                        }
                      }
                      
                      if (parsed.length === 0) {
                        // Fallback for old-format explanations
                        return (
                          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                            <p className="text-sm text-zinc-300 leading-relaxed">{explanation}</p>
                          </div>
                        );
                      }
                      
                      const sectionStyles: Record<string, { icon: any; borderColor: string; labelColor: string }> = {
                        'METHODOLOGY': { icon: <SearchCheck className="w-3.5 h-3.5" />, borderColor: 'border-blue-500/20', labelColor: 'text-blue-400' },
                        'FINDING': { icon: <AlertTriangle className="w-3.5 h-3.5" />, borderColor: auditResult.bias_detected ? 'border-rose-500/20' : 'border-emerald-500/20', labelColor: auditResult.bias_detected ? 'text-rose-400' : 'text-emerald-400' },
                        'CONCLUSION': { icon: <CheckCircle2 className="w-3.5 h-3.5" />, borderColor: 'border-amber-500/20', labelColor: 'text-amber-400' }
                      };
                      
                      return (
                        <div className="space-y-3">
                          {parsed.map((section, idx) => {
                            const style = sectionStyles[section.title.toUpperCase()] || sectionStyles['METHODOLOGY'];
                            return (
                              <motion.div 
                                key={section.title}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-4 rounded-xl border ${style.borderColor} bg-zinc-950/60`}
                              >
                                <div className={`flex items-center gap-1.5 ${style.labelColor} font-mono text-[9px] uppercase tracking-widest font-bold mb-2`}>
                                  {style.icon}
                                  {section.title}
                                </div>
                                <p className="text-sm text-zinc-300 leading-relaxed">
                                  {section.content}
                                </p>
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-950/40">
                    <AlertCircle className="w-8 h-8 text-zinc-600" />
                    <div>
                      <h4 className="font-sans text-sm font-bold text-zinc-200">Order-Swap Audit Pending</h4>
                      <p className="text-sm text-zinc-500 max-w-sm mt-1">
                        Re-evaluate this debate's neutrality by simulating the alternate presentation sequence.
                      </p>
                    </div>
                    <button
                      id="run-order-swap-audit-btn"
                      onClick={handleRunAudit}
                      disabled={isAuditing}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isAuditing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Auditing sequence...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Run Bias Audit
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ARGUMENT AUTOPSY TAB */}
          {activeTab === 'autopsy' && (
            <motion.div
              key="autopsy"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6 max-w-2xl"
            >
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-sans text-lg font-bold text-zinc-100">Argument Autopsy</h3>
              </div>

              {(() => {
                if (!fullDebate.autopsy) {
                  return (
                    <div className="p-8 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-950/40 animate-pulse">
                      <Sparkles className="w-8 h-8 text-zinc-600 animate-spin-slow" />
                      <div>
                        <h4 className="font-sans text-sm font-bold text-zinc-200">Generating Autopsy...</h4>
                        <p className="text-sm text-zinc-500 max-w-sm mt-1">
                          Analyzing the losing side's arguments to determine how they could have won...
                        </p>
                      </div>
                    </div>
                  );
                }

                try {
                  const autopsyData = JSON.parse(fullDebate.autopsy);
                  return (
                    <div className="space-y-5">
                      {/* Optimal Case Section */}
                      <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 shadow-inner">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-blue-400 font-bold block mb-3 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Optimal Case Rewrite
                        </span>
                        <p className="text-base text-zinc-200 leading-relaxed whitespace-pre-wrap select-text font-serif">
                          {autopsyData.optimal_case || autopsyData.optimalCase || 'No optimal case data available.'}
                        </p>
                      </div>

                      {/* Missing Analysis Section */}
                      <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 shadow-inner">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-amber-400 font-bold block mb-3 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Missing Analysis
                        </span>
                        <p className="text-base text-zinc-200 leading-relaxed whitespace-pre-wrap select-text font-serif">
                          {autopsyData.missing_analysis || autopsyData.missingAnalysis || 'No missing analysis data available.'}
                        </p>
                      </div>
                    </div>
                  );
                } catch {
                  return (
                    <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                      <p className="text-sm text-rose-300">Failed to parse autopsy data. The generated format was invalid.</p>
                      <button 
                        onClick={() => setFullDebate({...fullDebate, autopsy: undefined})}
                        className="mt-2 text-xs bg-rose-500/20 px-3 py-1 rounded hover:bg-rose-500/30 text-rose-200"
                      >
                        Retry Fetch
                      </button>
                    </div>
                  );
                }
              })()}
            </motion.div>
          )}

          {/* FULL TRANSCRIPT TAB */}
          {activeTab === 'transcript' && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <FileText className="w-5 h-5 text-zinc-400" />
                <h3 className="font-sans text-lg font-bold text-zinc-100">Completed Debate Transcripts</h3>
              </div>

              <div className="space-y-6">
                {fullDebate.turns.map((turn) => (
                  <div 
                    key={turn.id}
                    id={`verdict-transcript-turn-${turn.id}`}
                    className={`p-5 rounded-xl border ${
                      turn.side === 'for' ? 'bg-blue-500/5 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.03)]' : 'bg-purple-500/5 border-purple-500/20 shadow-[0_0_15px_rgba(139,92,246,0.03)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-800/50 pb-2">
                      <span className="font-sans text-sm font-bold text-zinc-100">
                        {turn.side === 'for' ? 'Side A (FOR)' : 'Side B (AGAINST)'}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 border border-zinc-850 px-2 py-1 rounded">
                        Round {turn.round_number} • Strength: <CountUp target={turn.strength_score} />/10
                      </span>
                    </div>
                    <p className="text-base text-zinc-300 leading-relaxed font-sans">{renderTurnContent(turn.content)}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Chained Debates / Transition Screen Panel */}
      <div 
        id="chained-debate-suggestions-panel"
        className="rounded-2xl border border-zinc-800 p-6 space-y-4 bg-zinc-900/60 backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="text-blue-400 w-5 h-5" />
          <h3 className="font-sans text-base font-bold text-zinc-100">Seed the Next Debate (Chained Series)</h3>
        </div>

        <p className="text-sm text-zinc-400 max-w-2xl leading-normal">
          The conclusion of this debate seeds suggestions for the next topic in the logical sequence. Select a follow-up to transition context and carry over the winner's momentum:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {isLoadingSuggestions ? (
            [1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-full"></div>
                <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                <div className="h-3 bg-zinc-800 rounded w-1/3 mt-2"></div>
              </div>
            ))
          ) : (
            chainedSuggestions.map((sug, i) => (
              <button
                key={i}
                id={`chained-suggest-btn-${i}`}
                onClick={() => onStartChainedDebate(sug)}
                className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 text-left hover:border-blue-500/50 text-sm transition-all cursor-pointer flex flex-col justify-between group space-y-3"
              >
                <p className="text-zinc-300 group-hover:text-zinc-100 leading-relaxed font-sans font-medium">{sug}</p>
                <span className="font-mono text-[10px] text-blue-400 flex items-center gap-1 mt-1 font-bold">
                  Chain Debate <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* High Fidelity Transcript PDF Preview Modal */}
      {showPdfPreview && (
        <PDFPreviewModal 
          debate={fullDebate} 
          onClose={() => setShowPdfPreview(false)} 
        />
      )}

    </div>
  );
}
