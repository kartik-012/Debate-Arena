/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Shield, Volume2, HelpCircle, CheckCircle2, AlertTriangle, AlertCircle, 
  ArrowRight, Sparkles, Send, User, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Debate, DebateTurn, FactCheck, ConsistencyFlag } from '../types';
import { api } from '../services/api';
import CourtroomScene from './CourtroomScene';

const renderTurnContent = (content: string) => {
  if (!content) return content;
  
  const thesisMatch = content.match(/<thesis>([\s\S]*?)<\/thesis>/);
  if (thesisMatch) {
    const before = content.substring(0, thesisMatch.index);
    const thesis = thesisMatch[1];
    const after = content.substring(thesisMatch.index! + thesisMatch[0].length);
    return (
      <>
        {before}
        <strong className="text-lg text-zinc-100 font-bold">{thesis}</strong>
        {after}
      </>
    );
  }
  
  const firstSentenceMatch = content.match(/^([\s\S]*?[.!?](?:\s|$))([\s\S]*)/);
  if (firstSentenceMatch) {
    return (
      <>
        <strong className="text-zinc-100 font-semibold">{firstSentenceMatch[1]}</strong>
        {firstSentenceMatch[2]}
      </>
    );
  }
  
  return content;
};

function CountUp({ target, duration = 800 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(1)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return <>{value}</>;
}

interface LiveDebateViewProps {
  debate: Debate;
  onDebateComplete: (updatedDebate: Debate) => void;
  onNavigateToVerdict: () => void;
}

export default function LiveDebateView({
  debate,
  onDebateComplete,
  onNavigateToVerdict
}: LiveDebateViewProps) {
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [activeTurn, setActiveTurn] = useState<DebateTurn | null>(null);
  const [typedContent, setTypedContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Mid-debate user participation state
  const [showUserParticipation, setShowUserParticipation] = useState(false);
  const [userArgText, setUserArgText] = useState('');
  const [userSide, setUserSide] = useState<'for' | 'against'>('for');

  // Interactive popup detail states
  const [selectedFactCheck, setSelectedFactCheck] = useState<FactCheck | null>(null);
  const [selectedConsistency, setSelectedConsistency] = useState<ConsistencyFlag | null>(null);

  // Scroll ref for transcript
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Extract all turns that have been 'revealed' so far
  const revealedTurns = debate.turns.slice(0, currentTurnIndex);

  // Effect to poll the backend for new turns
  useEffect(() => {
    let intervalId: any;
    if (debate.status === 'in_progress' || debate.status === 'judging') {
      intervalId = setInterval(async () => {
        try {
          const latest = await api.getDebate(debate.id);
          if (latest.turns.length > debate.turns.length || latest.status !== debate.status) {
            onDebateComplete(latest);
          }
          if (latest.status === 'complete') {
            onNavigateToVerdict();
          }
        } catch (err) {
          console.error("Polling failed", err);
        }
      }, 500);
    }
    return () => clearInterval(intervalId);
  }, [debate.id, debate.status, debate.turns.length]);

  // Effect to handle typing animation when new turns arrive
  useEffect(() => {
    if (debate.status === 'complete') {
      setCurrentTurnIndex(debate.turns.length);
      setActiveTurn(null);
      setIsTyping(false);
      return;
    }

    if (currentTurnIndex < debate.turns.length) {
      const turn = debate.turns[currentTurnIndex];
      setActiveTurn(turn);
      setIsTyping(true);
      setTypedContent('');

      let charIndex = 0;
      const totalLength = turn.content.length;
      // We want the typing animation to take roughly 2.0 seconds (2000ms) for a clean, continuous speed
      const targetDuration = 2000;
      const interval = 20; // 20ms per step (50 FPS)
      const step = Math.max(1, Math.ceil(totalLength / (targetDuration / interval))); 
      
      const intervalId = setInterval(() => {
        if (charIndex < totalLength) {
          setTypedContent(prev => prev + turn.content.substring(charIndex, charIndex + step));
          charIndex += step;
        } else {
          clearInterval(intervalId);
          setIsTyping(false);
          setTimeout(() => {
            setCurrentTurnIndex(prev => prev + 1);
          }, 400); // Small pause before moving to the next turn
        }
      }, interval);

      return () => clearInterval(intervalId);
    } else {
      setActiveTurn(null);
      setIsTyping(false);
    }
  }, [currentTurnIndex, debate.turns.length, debate.status]);

  // Scroll to bottom on transcript updates
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [revealedTurns.length, typedContent]);

  // Handle user turn insertion
  const handleUserArgSubmit = () => {
    if (!userArgText.trim()) return;

    // Create a user turn object
    const userTurnId = `user-turn-${Math.random()}`;
    const newUserTurn: DebateTurn = {
      id: userTurnId,
      debate_id: debate.id,
      side: userSide,
      round_number: Math.ceil((revealedTurns.length + 1) / 2),
      content: userArgText,
      strength_score: parseFloat((7.5 + Math.random() * 2).toFixed(1)),
      is_user_submitted: true,
      created_at: new Date().toISOString()
    };

    // Add random fun fact-check to user input
    if (Math.random() > 0.3) {
      newUserTurn.fact_checks = [{
        id: `fc-user-${Math.random()}`,
        turn_id: userTurnId,
        claim_text: userArgText.split(' ').slice(0, 6).join(' ') + "...",
        verdict: 'verified',
        source_url: 'https://example.edu/user-debate-evidence',
        explanation: 'The user\'s primary assertion is reasonable and logically sound based on core conversational principles.'
      }];
    }

    // Insert user turn into the debate turns array at the current position
    const updatedTurns = [
      ...debate.turns.slice(0, currentTurnIndex),
      newUserTurn,
      ...debate.turns.slice(currentTurnIndex).map(t => ({
        ...t,
        round_number: t.round_number + 1 // Increment subsequent rounds
      }))
    ];

    const updatedDebate = {
      ...debate,
      turns: updatedTurns,
      rounds_total: debate.rounds_total + 1
    };

    onDebateComplete(updatedDebate);
    setShowUserParticipation(false);
    setUserArgText('');
    
    // Advance index past the newly inserted turn
    setCurrentTurnIndex(prev => prev + 1);
  };

  // Prepare chart data for Recharts
  const getChartData = () => {
    const data: any[] = [];
    // Group turns by round number
    const roundsMap: { [key: number]: { round: string; SideA?: number; SideB?: number } } = {};

    revealedTurns.forEach(turn => {
      const r = turn.round_number;
      if (!roundsMap[r]) {
        roundsMap[r] = { round: `Round ${r}` };
      }
      if (turn.side === 'for') {
        roundsMap[r].SideA = turn.strength_score;
      } else {
        roundsMap[r].SideB = turn.strength_score;
      }
    });

    // Also include active typing turn for immediate visualization
    if (activeTurn) {
      const r = activeTurn.round_number;
      if (!roundsMap[r]) {
        roundsMap[r] = { round: `Round ${r}` };
      }
      if (activeTurn.side === 'for') {
        roundsMap[r].SideA = activeTurn.strength_score;
      } else {
        roundsMap[r].SideB = activeTurn.strength_score;
      }
    }

    Object.keys(roundsMap).forEach(key => {
      data.push(roundsMap[parseInt(key)]);
    });

    return data;
  };

  const chartData = getChartData();

  // Active speaker helper for CourtroomScene
  const getActiveSpeakerForScene = (): 'for' | 'against' | 'judge' | 'idle' => {
    if (debate.status === 'judging') return 'judge';
    if (!activeTurn) return 'idle';
    return activeTurn.side;
  };

  return (
    <div id="live-debate-container" className="flex-1 flex flex-col min-h-0 select-none bg-[#09090b]">
      {/* Top Header Panel */}
      <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-zinc-900 shrink-0">
        <div className="flex-1 min-w-0">
          <span className="font-mono text-[9px] uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
            {debate.category}
          </span>
          <h2 className="font-sans text-base md:text-lg font-bold text-zinc-100 truncate mt-1">
            {debate.question}
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
              {debate.status === 'judging' ? 'Deliberation' : `Round ${Math.min(debate.current_round, activeTurn?.round_number || debate.rounds_total)} of ${debate.rounds_total}`}
            </p>
            <p className="font-sans text-xs font-semibold text-zinc-200">
              {debate.status === 'judging' ? 'Evaluating' : activeTurn ? `Speaker: ${activeTurn.side.toUpperCase()}` : 'Complete'}
            </p>
          </div>

          {debate.status === 'complete' && (
            <button
              id="view-verdict-nav-btn"
              onClick={onNavigateToVerdict}
              className="accent-gradient hover:brightness-110 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-blue-500/10"
            >
              View Verdict
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-0 bg-[#09090b]">
        
        {/* Left Column: Courtroom & Scoring (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
          {/* Courtroom scene wrapper */}
          <CourtroomScene 
            activeSpeaker={getActiveSpeakerForScene()}
            winningSide={debate.winning_side}
            status={debate.status}
          />

          {/* Recharts Live Strength/Confidence Chart */}
          <div 
            id="live-score-chart-panel" 
            className="p-4 rounded-2xl flex flex-col h-56 shrink-0 border border-zinc-800 bg-zinc-900/60 backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="font-sans text-xs font-bold text-zinc-100">Live Argument Momentum Graph</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#2d6a4f' }} />
                  <span className="font-mono text-[9px] text-zinc-300">Side A (FOR)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#a34e2c' }} />
                  <span className="font-mono text-[9px] text-zinc-300">Side B (AGAINST)</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full text-xs">
              {chartData.length === 0 ? (
                <div className="w-full h-full relative rounded-lg overflow-hidden">
                  <div className="absolute inset-0 shimmer rounded-lg" />
                  <div className="absolute left-0 right-0 border-t border-zinc-700/30" style={{ top: '25%' }} />
                  <div className="absolute left-0 right-0 border-t border-zinc-700/30" style={{ top: '50%' }} />
                  <div className="absolute left-0 right-0 border-t border-zinc-700/30" style={{ top: '75%' }} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" opacity={0.4} />
                    <XAxis 
                      dataKey="round" 
                      stroke="#71717a" 
                      fontSize={10} 
                      fontFamily="JetBrains Mono"
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[5, 10]} 
                      stroke="#71717a" 
                      fontSize={10} 
                      fontFamily="JetBrains Mono"
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5' }}
                      labelStyle={{ fontFamily: 'Inter', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="SideA" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }} 
                      name="Side A Strength"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="SideB" 
                      stroke="#a855f7" 
                      strokeWidth={3} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }} 
                      name="Side B Strength"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Argument Transcript & Live Logs (5 Cols) */}
        <div 
          id="transcript-panel"
          className="lg:col-span-5 rounded-2xl flex flex-col overflow-hidden min-h-[400px] lg:min-h-0 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-2xl"
        >
          {/* Transcript Header */}
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between shrink-0">
            <span className="font-sans text-xs font-bold text-zinc-100">Court Transcript Log</span>
            
            {/* Mid Debate Join Button */}
            {debate.status === 'in_progress' && !showUserParticipation && (
              <button
                id="jump-in-debate-btn"
                onClick={() => setShowUserParticipation(true)}
                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <User className="w-3 h-3" />
                Intervene! (Add Turn)
              </button>
            )}
          </div>

          {/* Transcript Stream (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            
            {/* Skeleton loaders when in_progress but no turns yet */}
            {debate.status === 'in_progress' && revealedTurns.length === 0 && !activeTurn && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex flex-col rounded-xl p-3 border border-zinc-800 bg-zinc-800/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shimmer" />
                        <div className="h-3 w-24 rounded shimmer" />
                        <div className="h-3 w-8 rounded shimmer" />
                      </div>
                      <div className="h-4 w-20 rounded shimmer" />
                    </div>
                    <div className="space-y-2 mt-2">
                      <div className="h-3 w-full rounded shimmer" />
                      <div className="h-3 w-11/12 rounded shimmer" />
                      <div className="h-3 w-4/5 rounded shimmer" />
                      <div className="h-3 w-1/2 rounded shimmer" />
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {revealedTurns.map((turn, idx) => (
              <motion.div
                key={turn.id}
                id={`transcript-turn-${turn.id}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col rounded-xl p-3 border transition-all ${
                  turn.is_user_submitted
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : turn.side === 'for'
                    ? 'bg-blue-500/5 border-blue-500/15'
                    : 'bg-purple-500/5 border-purple-500/15'
                }`}
              >
                {/* Turn Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      turn.is_user_submitted ? 'bg-amber-400' : turn.side === 'for' ? 'bg-blue-400' : 'bg-purple-400'
                    }`} />
                    <span className="font-sans text-xs font-bold text-zinc-100">
                      {turn.is_user_submitted ? 'YOUR ARGUMENT' : turn.side === 'for' ? `Side A (FOR)` : `Side B (AGAINST)`}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-500">
                      R{turn.round_number}
                    </span>
                  </div>

                  <span className="font-mono text-[10px] bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-semibold">
                    Strength: <CountUp target={turn.strength_score} />/10
                  </span>
                </div>

                {/* Content */}
                <div className="font-sans text-base py-2 leading-relaxed text-zinc-300 whitespace-pre-wrap">
                  {renderTurnContent(turn.content)}
                </div>

                {/* Flags and intelligence warnings */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-zinc-800/40">
                  {/* Fact check trigger button */}
                  {turn.fact_checks?.map(fc => (
                    <button
                      key={fc.id}
                      id={`fc-badge-${fc.id}`}
                      onClick={() => setSelectedFactCheck(fc)}
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors ${
                        fc.verdict === 'verified'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                          : fc.verdict === 'false'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                      }`}
                    >
                      {fc.verdict === 'verified' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                      Fact-Check: {fc.verdict.toUpperCase()}
                    </button>
                  ))}

                  {/* Consistency Flag trigger button */}
                  {turn.consistency_flags?.map(cf => (
                    <button
                      key={cf.id}
                      id={`cf-badge-${cf.id}`}
                      onClick={() => setSelectedConsistency(cf)}
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <AlertCircle className="w-2.5 h-2.5" />
                      Inconsistency Flagged
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Active Typing Card */}
            {activeTurn && isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col rounded-xl p-3 border ${
                  activeTurn.side === 'for'
                    ? 'bg-blue-500/5 border-blue-500/25 shadow-md ring-1 ring-blue-500/10'
                    : 'bg-purple-500/5 border-purple-500/25 shadow-md ring-1 ring-purple-500/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeTurn.side === 'for' ? 'bg-blue-400' : 'bg-purple-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${activeTurn.side === 'for' ? 'bg-blue-400' : 'bg-purple-400'}`}></span>
                    </span>
                    <span className="font-sans text-xs font-bold text-zinc-100">
                      {activeTurn.side === 'for' ? 'Side A (FOR)' : 'Side B (AGAINST)'}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-500">
                      R{activeTurn.round_number} is typing...
                    </span>
                  </div>
                </div>

                <div className="font-sans text-base py-2 leading-relaxed text-zinc-400 italic whitespace-pre-wrap">
                  {renderTurnContent(typedContent)}
                  <span className="animate-pulse inline-block w-1.5 h-4 ml-0.5 align-middle bg-zinc-300" />
                </div>
              </motion.div>
            )}

            {/* Deliberating / Judging State */}
            {debate.status === 'judging' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 animate-spin">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans text-sm font-bold text-zinc-100">Judge Deliberation in Progress</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    The judge is evaluating rounds, reviewing consistency flags, and parsing fact-checks to render the final verdict...
                  </p>
                </div>
              </motion.div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* User Participation Section (Overlay Panel at bottom of transcript) */}
          <AnimatePresence>
            {showUserParticipation && (
              <motion.div
                id="user-participation-panel"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="border-t border-zinc-800 p-4 space-y-3 shrink-0 bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="font-sans text-xs font-bold text-zinc-200">Intervene in Debate</span>
                  </div>
                  <button
                    id="close-participation-btn"
                    onClick={() => setShowUserParticipation(false)}
                    className="font-mono text-[10px] text-zinc-500 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* Side Selection */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300">Argue for:</span>
                  <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[10px] font-bold">
                    <button
                      id="user-side-for-btn"
                      onClick={() => setUserSide('for')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        userSide === 'for' ? 'accent-gradient text-white' : 'text-zinc-400'
                      }`}
                    >
                      Side A (FOR)
                    </button>
                    <button
                      id="user-side-against-btn"
                      onClick={() => setUserSide('against')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        userSide === 'against' ? 'bg-purple-600 text-white' : 'text-zinc-400'
                      }`}
                    >
                      Side B (AGAINST)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    id="user-argument-textarea"
                    rows={3}
                    placeholder="Type your powerful debate intervention here..."
                    value={userArgText}
                    onChange={(e) => setUserArgText(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border bg-zinc-950 border-zinc-850 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    id="submit-user-argument-btn"
                    onClick={handleUserArgSubmit}
                    disabled={!userArgText.trim()}
                    className="absolute right-2 bottom-3.5 p-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-800 text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FACT-CHECK MODAL DETAILS */}
      <AnimatePresence>
        {selectedFactCheck && (
          <div 
            id="fc-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              id="fc-modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative bg-zinc-900 border border-zinc-800"
            >
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-855">
                <Shield className={`w-5 h-5 ${selectedFactCheck.verdict === 'verified' ? 'text-blue-400' : 'text-rose-400'}`} />
                <h3 className="font-sans text-sm font-bold text-zinc-100">Fact-Check Audit Report</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">CLAIM EVALUATED</h4>
                  <p className="text-xs text-zinc-300 italic font-medium mt-1 bg-zinc-950 p-2.5 rounded border border-zinc-800">
                    &ldquo;{selectedFactCheck.claim_text}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-sans">VERDICT:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    selectedFactCheck.verdict === 'verified'
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : selectedFactCheck.verdict === 'false'
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedFactCheck.verdict}
                  </span>
                </div>

                <div>
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">EXPLANATION</h4>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {selectedFactCheck.explanation}
                  </p>
                </div>

                {selectedFactCheck.source_url && (
                  <div>
                    <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">SOURCE CITATION</h4>
                    <a 
                      href={selectedFactCheck.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline break-all block mt-1"
                    >
                      {selectedFactCheck.source_url}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  id="close-fc-modal-btn"
                  onClick={() => setSelectedFactCheck(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer border border-zinc-700"
                >
                  Dismiss Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONSISTENCY WARNING MODAL DETAILS */}
      <AnimatePresence>
        {selectedConsistency && (
          <div 
            id="cf-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              id="cf-modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative bg-zinc-900 border border-zinc-800"
            >
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-sans text-sm font-bold text-zinc-100">Consistency Audit Flag</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    <strong>Cognitive Discrepancy Detected:</strong> The orchestrator identified that the speaker is backtracking or contradicting a premise established earlier in the debate sequence.
                  </p>
                </div>

                <div>
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">AUDITOR ASSESSMENT</h4>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {selectedConsistency.explanation}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  id="close-cf-modal-btn"
                  onClick={() => setSelectedConsistency(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer border border-zinc-700"
                >
                  Acknowledge Flag
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
