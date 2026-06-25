/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scale, MessageSquare, Compass, Gavel, ArrowRight, Sparkles, AlertCircle, 
  Settings, FolderPlus, BookOpen, User, HelpCircle, ArrowLeft, ArrowUpRight,
  Command, Search, BarChart3, Library
} from 'lucide-react';
import { Debate } from './types';
import { api } from './services/api';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import LiveDebateView from './components/LiveDebateView';
import VerdictView from './components/VerdictView';
import AnalyticsView from './components/AnalyticsView';
import LibraryView from './components/LibraryView';
import WaveBackground from './components/WaveBackground';
import IntroSplash from './components/IntroSplash';

export default function App() {
  // Primary Debate database state
  const [debates, setDebates] = useState<Debate[]>([]);
  const [activeDebateId, setActiveDebateId] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'live' | 'verdict' | 'library' | 'analytics'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Intro Sequence State (Runs once per session)
  const [showIntro, setShowIntro] = useState(() => {
    return sessionStorage.getItem('hasSeenIntro') !== 'true';
  });
  const [introExiting, setIntroExiting] = useState(false);

  const handleIntroComplete = useCallback(() => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
  }, []);

  const handleIntroExiting = useCallback(() => {
    setIntroExiting(true);
  }, []);

  useEffect(() => {
    api.listDebates().then(data => setDebates(data)).catch(console.error);
  }, []);

  // Modal controls
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Orchestrator State parameters
  const [rounds, setRounds] = useState<number>(3);
  const [tone, setTone] = useState<'formal' | 'casual' | 'courtroom'>('courtroom');
  const [modelFor, setModelFor] = useState<string>('Gemini 3.1 Flash Lite');
  const [modelAgainst, setModelAgainst] = useState<string>('Gemini 3.1 Flash Lite');
  const [modelJudge, setModelJudge] = useState<string>('Gemini 3.1 Flash Lite');

  // Home Screen user search input states
  const [questionText, setQuestionText] = useState('');
  const [inputError, setInputError] = useState('');
  const [isStartingDebate, setIsStartingDebate] = useState(false);
  const [homeTemplateCategory, setHomeTemplateCategory] = useState<string>('All');

  // Command Palette State
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');
  const [cmdIndex, setCmdIndex] = useState(0);

  // Quota Data State
  const [quotaData, setQuotaData] = useState<any>(null);

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const data = await api.getQuota();
        setQuotaData(data);
      } catch (err) {
        console.error("Failed to fetch quota", err);
      }
    };
    fetchQuota();
    const interval = setInterval(fetchQuota, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cmd+K Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdkOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isCmdkOpen) {
        setIsCmdkOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCmdkOpen]);

  // Command Palette Items
  const cmdItems = [
    { id: 'new', label: 'Start New Debate', icon: <Scale className="w-4 h-4" />, action: () => { handleNewDebateTrigger(); setIsCmdkOpen(false); } },
    { id: 'settings', label: 'Open Settings', icon: <Settings className="w-4 h-4" />, action: () => { setIsSettingsOpen(true); setIsCmdkOpen(false); } },
    { id: 'analytics', label: 'View Analytics', icon: <BarChart3 className="w-4 h-4" />, action: () => { setCurrentScreen('analytics'); setIsCmdkOpen(false); } },
    { id: 'library', label: 'Browse Library', icon: <Library className="w-4 h-4" />, action: () => { setCurrentScreen('library'); setIsCmdkOpen(false); } },
    ...debates.slice(0, 10).map(d => ({
      id: `debate-${d.id}`,
      label: `Go to: ${d.question.length > 60 ? d.question.substring(0, 60) + '...' : d.question}`,
      icon: <MessageSquare className="w-4 h-4" />,
      action: () => { handleSelectDebate(d.id); setIsCmdkOpen(false); }
    }))
  ].filter(item => item.label.toLowerCase().includes(cmdSearch.toLowerCase()));

  // Reset index on search change
  useEffect(() => {
    setCmdIndex(0);
  }, [cmdSearch]);

  // Command Palette Keyboard Navigation
  const handleCmdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCmdIndex(prev => (prev + 1) % cmdItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCmdIndex(prev => (prev - 1 + cmdItems.length) % cmdItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cmdItems[cmdIndex]) {
        cmdItems[cmdIndex].action();
      }
    }
  };


  // Recommendations mapping — 8-10 templates per category for random rotation
  const categoryTemplates: { [key: string]: { title: string; desc: string; question: string }[] } = {
    All: [
      { title: "Ethical AI Rights", desc: "Should advanced neural nets hold legal status?", question: "Should advanced AI systems be granted legal personhood and basic rights?" },
      { title: "Mars Colonization", desc: "Prioritize multi-planetary life or Earth repair?", question: "Should Mars colonization be prioritized over Earth's climate preservation?" },
      { title: "Universal Basic Income", desc: "Viable counter to technological unemployment?", question: "Should governments implement a Universal Basic Income (UBI) to combat technological unemployment?" },
      { title: "Genetic Enhancement", desc: "Designer babies vs natural selection?", question: "Should genetic editing of human embryos be permitted for non-medical enhancements?" },
      { title: "Digital Privacy", desc: "Surveillance capitalism vs public safety?", question: "Should governments have backdoor access to encrypted communications for national security?" },
      { title: "Nuclear Energy", desc: "Clean power or existential risk?", question: "Should nuclear energy be the primary solution to the global energy crisis?" },
      { title: "Social Media Age Limits", desc: "Protect youth or restrict freedom?", question: "Should social media platforms enforce a minimum age of 16 for account creation?" },
      { title: "Space Militarization", desc: "Defend or disarm the final frontier?", question: "Should nations be allowed to deploy weapons systems in outer space?" },
      { title: "Meat Industry Ban", desc: "Animal welfare vs cultural tradition?", question: "Should factory farming be banned in favor of lab-grown meat alternatives?" },
      { title: "Four-Day Work Week", desc: "Productivity boost or economic drag?", question: "Should the standard work week be reduced to four days with no pay reduction?" }
    ],
    Tech: [
      { title: "Open Source Algorithms", desc: "Mandate open source for public feeds?", question: "Should all social media recommendation algorithms be mandated to open-source their codebase?" },
      { title: "Autonomous Vehicles", desc: "Ethical steering choices in collision states?", question: "Should self-driving vehicles be programmed to prioritize passenger lives over pedestrians in critical crash states?" },
      { title: "AI in Hiring", desc: "Efficiency gain or bias amplifier?", question: "Should companies be allowed to use AI-only screening for job applications without human review?" },
      { title: "Quantum Computing Access", desc: "Open research or national security asset?", question: "Should quantum computing breakthroughs be classified as national security assets rather than published openly?" },
      { title: "Brain-Computer Interfaces", desc: "Cognitive revolution or digital divide?", question: "Should brain-computer interfaces be regulated as medical devices even for consumer applications?" },
      { title: "Deep Fake Regulation", desc: "Free speech vs manufactured reality?", question: "Should the creation and distribution of AI-generated deepfakes be criminalized?" },
      { title: "Tech Monopoly Breakup", desc: "Innovation stifler or consumer protector?", question: "Should antitrust laws force the breakup of trillion-dollar technology companies?" },
      { title: "Robot Taxation", desc: "Fund displaced workers or slow automation?", question: "Should companies pay a 'robot tax' for every human job replaced by automation?" }
    ],
    Ethics: [
      { title: "Cognitive Enhancement", desc: "Regulate neurotech implants?", question: "Should cognitive-enhancing neural implants be strictly regulated for non-medical performance enhancements?" },
      { title: "Animal Sentience", desc: "Extend labor laws to intelligent primates?", question: "Should highly cognitive non-human species like dolphins and primates hold basic legal labor protections?" },
      { title: "Right to Die", desc: "Personal autonomy vs sanctity of life?", question: "Should terminally ill patients have an unrestricted legal right to physician-assisted death?" },
      { title: "Organ Market", desc: "Save lives or exploit the desperate?",  question: "Should the buying and selling of human organs be legalized to reduce transplant waiting lists?" },
      { title: "Child Soldiers", desc: "Military recruitment age boundaries?", question: "Should the minimum military recruitment age be raised to 21 worldwide?" },
      { title: "Truth Commissions", desc: "Justice vs reconciliation?", question: "Should post-conflict nations prioritize truth and reconciliation over criminal prosecution?" },
      { title: "Human Cloning", desc: "Scientific frontier or moral abyss?", question: "Should therapeutic human cloning be permitted for medical research purposes?" },
      { title: "Whistleblower Protection", desc: "National security vs public interest?", question: "Should whistleblowers who expose government surveillance programs receive blanket legal immunity?" }
    ],
    Science: [
      { title: "Geoengineering", desc: "Deploy sulfur particles to block solar heat?", question: "Should humanity deploy solar radiation management (geoengineering) to combat global warming?" },
      { title: "De-Extinction Projects", desc: "Resurrect mammoths or conserve living flora?", question: "Should funding be prioritized for resurrecting extinct species like mammoths over conserving endangered living ones?" },
      { title: "CRISPR Food Supply", desc: "Feed billions or risk ecosystem collapse?", question: "Should CRISPR gene editing be deployed at scale in agriculture without long-term ecological studies?" },
      { title: "Ocean Mining", desc: "Resource frontier or environmental catastrophe?", question: "Should deep-sea mining be permitted to extract rare earth minerals needed for green technology?" },
      { title: "Asteroid Deflection", desc: "Fund planetary defense or focus earthward?", question: "Should global governments allocate 1% of GDP to asteroid detection and deflection systems?" },
      { title: "Human Hibernation", desc: "Deep space enabler or biological gamble?", question: "Should human hibernation technology be developed for long-duration space missions?" },
      { title: "Lab-Grown Organs", desc: "End transplant shortages or play god?", question: "Should scientists be allowed to grow full human organs in animal hosts for transplantation?" },
      { title: "Solar Shade Satellites", desc: "Cool the planet or block the sun?", question: "Should we deploy orbital solar shades to reduce Earth's temperature by 1.5°C?" }
    ],
    Politics: [
      { title: "Corporate Sovereignty", desc: "Are global tech firms more powerful than states?", question: "Should transnational technology corporations face regulation under international human rights treaties?" },
      { title: "Digital Voting Systems", desc: "Are electronic election portals secure?", question: "Should national election cycles transition fully to cryptographic digital voting systems?" },
      { title: "Global Tax Minimum", desc: "End tax havens or stifle competition?", question: "Should a global minimum corporate tax rate of 25% be enforced across all nations?" },
      { title: "Abolish Electoral College", desc: "Direct democracy vs representative balance?", question: "Should the United States abolish the Electoral College in favor of a popular vote?" },
      { title: "UN Veto Power", desc: "Security Council reform or institutional collapse?", question: "Should the UN Security Council veto power be abolished to democratize international governance?" },
      { title: "Immigration Quotas", desc: "Border control vs freedom of movement?", question: "Should wealthy nations be required to accept a minimum quota of climate refugees annually?" },
      { title: "Reparations Policy", desc: "Historical justice vs practical impossibility?", question: "Should governments pay financial reparations for historical slavery and colonialism?" },
      { title: "Term Limits", desc: "Fresh leadership vs experienced governance?", question: "Should all elected officials be subject to strict two-term limits regardless of position?" }
    ]
  };

  // Random rotation: pick 2 templates per category, avoid immediate repeats
  const [lastShownIndices, setLastShownIndices] = useState<{ [key: string]: number[] }>({});
  
  const getRotatedTemplates = (cat: string) => {
    const templates = categoryTemplates[cat] || [];
    if (templates.length <= 2) return templates;
    
    const lastIndices = lastShownIndices[cat] || [];
    const availableIndices = templates.map((_, i) => i).filter(i => !lastIndices.includes(i));
    
    // Pick 2 random from available pool
    const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 2);
    
    return picked.map(i => templates[i]);
  };

  // Update rotation when category changes
  useEffect(() => {
    const templates = categoryTemplates[homeTemplateCategory] || [];
    if (templates.length <= 2) return;
    
    const lastIndices = lastShownIndices[homeTemplateCategory] || [];
    const availableIndices = templates.map((_, i) => i).filter(i => !lastIndices.includes(i));
    const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 2);
    
    setLastShownIndices(prev => ({ ...prev, [homeTemplateCategory]: picked }));
  }, [homeTemplateCategory]);

  // Select a preset debate to review or replay
  const handleSelectDebate = (id: string) => {
    setActiveDebateId(id);
    const selected = debates.find((d) => d.id === id);
    if (selected) {
      if (selected.status === 'complete') {
        setCurrentScreen('verdict');
      } else {
        setCurrentScreen('live');
      }
    }
  };

  // Start a fresh debate on user custom question
  const handleStartDebate = async (topic: string) => {
    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setInputError('Please enter a question to debate.');
      return;
    }

    setInputError('');
    setIsStartingDebate(true);

    try {
      const newDebate = await api.startDebate({
        question: cleanTopic,
        rounds_total: rounds,
        tone: tone,
        model_for: modelFor,
        model_against: modelAgainst,
        model_judge: modelJudge
      });

      setDebates(prev => [newDebate, ...prev]);
      setActiveDebateId(newDebate.id);
      setCurrentScreen('live');
    } catch (err) {
      console.error(err);
      setInputError('Failed to start debate. Is the backend running?');
    } finally {
      setIsStartingDebate(false);
    }
  };

  // Callback to update active debate state (for turn injection or progress sync)
  const handleUpdateDebate = (updatedDebate: Debate) => {
    setDebates(prev => prev.map(d => d.id === updatedDebate.id ? updatedDebate : d));
  };

  // Nav to Home screen
  const handleNewDebateTrigger = () => {
    setActiveDebateId(null);
    setQuestionText('');
    setInputError('');
    setCurrentScreen('home');
  };

  return (
    <div id="debate-arena-app" className="h-screen w-screen flex overflow-hidden font-sans text-zinc-100 bg-[#050505] relative">
      {showIntro && <IntroSplash onComplete={handleIntroComplete} onExiting={handleIntroExiting} />}
      <WaveBackground />
      <div className="arena-grid" aria-hidden="true" style={{ zIndex: 0 }} />
      

      {/* 1. SIDEBAR NAVIGATION PANEL */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. MAIN ACTIVE WORKSPACE PANEL */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <AnimatePresence mode="wait">
          
          {/* HOME / NEW DEBATE CONFIGURATION SCREEN */}
          {currentScreen === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={showIntro && !introExiting ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto p-4 md:p-12 flex flex-col items-center justify-center space-y-8 select-none relative"
            >
              {/* Background gradient glow */}
              <div className="absolute -right-20 -bottom-20 w-80 h-80 accent-gradient rounded-full blur-[120px] opacity-15 pointer-events-none" />
              <div className="absolute -left-20 -top-20 w-80 h-80 bg-blue-500 rounded-full blur-[120px] opacity-10 pointer-events-none" />

              {/* Central Glowing Gavel Emblem */}
              <div className="text-center space-y-3 max-w-xl relative z-10">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl flex items-center justify-center text-white relative">
                    <Gavel className="w-8 h-8 rotate-45 text-blue-400" />
                    <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-purple-400 animate-pulse" />
                  </div>
                </div>
                <h1 className="font-sans text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                  What should we debate today?
                </h1>
                <p className="text-xs md:text-sm text-zinc-400 leading-normal font-sans">
                  Configure multi-agent parameters, pick an investigative prompt, and observe two AI entities challenge each other under independent judicial oversight.
                </p>
              </div>

              {/* Central Interactive Control Card (Premium Bento Grid style) */}
              <div 
                id="search-control-card"
                className="w-full max-w-2xl bento-card p-6 space-y-6 shadow-2xl relative z-10 border border-zinc-800 bg-zinc-900/60 backdrop-blur-md"
              >
                {/* 3 columns highlighting presets like the video */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 flex flex-col items-start space-y-1.5 hover:border-zinc-700 transition-colors">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <h4 className="font-sans text-xs font-bold text-zinc-200">Saved Debate Pre-sets</h4>
                    <p className="text-[10px] text-zinc-500 leading-normal">Load fully articulated historical debates with high fidelity transcripts.</p>
                  </div>

                  <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 flex flex-col items-start space-y-1.5 hover:border-zinc-700 transition-colors">
                    <Settings className="w-4 h-4 text-purple-400" />
                    <h4 className="font-sans text-xs font-bold text-zinc-200">Tone Tuning</h4>
                    <p className="text-[10px] text-zinc-500 leading-normal">Switch orchestrator tone from strict legal debate to casual banter.</p>
                  </div>

                  <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 flex flex-col items-start space-y-1.5 hover:border-zinc-700 transition-colors">
                    <Scale className="w-4 h-4 text-pink-400" />
                    <h4 className="font-sans text-xs font-bold text-zinc-200">Single Engine</h4>
                    <p className="text-[10px] text-zinc-500 leading-normal">Gemini 3.1 Flash Lite powers both opposing podiums and presides as the judge.</p>
                  </div>
                </div>

                {/* Search query recommendations categories filter */}
                <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 max-w-sm overflow-x-auto scrollbar-none">
                  {Object.keys(categoryTemplates).map((cat) => (
                    <button
                      key={cat}
                      id={`home-cat-filter-${cat}`}
                      onClick={() => setHomeTemplateCategory(cat)}
                      className={`flex-1 py-1.5 px-3 text-[10px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                        homeTemplateCategory === cat 
                          ? 'accent-gradient text-white shadow-md' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Suggested template cards list based on selected filter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {getRotatedTemplates(homeTemplateCategory).map((tmpl, idx) => (
                    <button
                      key={idx}
                      id={`home-template-btn-${idx}`}
                      onClick={() => {
                        setQuestionText(tmpl.question);
                        setInputError('');
                      }}
                      className="p-3.5 rounded-xl border border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/20 hover:bg-zinc-900/60 text-left text-xs transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        <span className="font-mono text-[9px] text-blue-400 font-bold uppercase tracking-wider mb-1 block">Template Suggestion</span>
                        <h4 className="font-sans font-bold text-zinc-100 group-hover:text-blue-300">{tmpl.title}</h4>
                        <p className="text-[10px] text-zinc-500 mt-1 leading-normal">{tmpl.desc}</p>
                      </div>
                      <span className="font-mono text-[9px] text-blue-400 flex items-center gap-1 mt-3 font-semibold group-hover:translate-x-1 transition-transform">
                        Load Prompt <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>

                {/* Question Input form section */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-sans font-bold text-zinc-200">Submit Custom Motion</label>
                    {questionText.length > 0 && (
                      <span className={`font-mono text-[10px] ${questionText.length > 300 ? 'text-rose-500 font-bold' : 'text-zinc-500'}`}>
                        {questionText.length}/300 chars
                      </span>
                    )}
                  </div>

                  <div className={`relative flex items-center rounded-xl border p-2 transition-all bg-zinc-950 ${
                    inputError ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-zinc-800 focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-blue-500/10'
                  }`}>
                    {/* Left Icon decoration */}
                    <div className="p-2 text-zinc-500 shrink-0">
                      <Scale className="w-4 h-4 text-blue-400" />
                    </div>

                    <input
                      id="debate-question-input"
                      type="text"
                      placeholder="e.g. Should advanced AI systems be granted legal personhood?"
                      value={questionText}
                      onChange={(e) => {
                        setQuestionText(e.target.value);
                        if (e.target.value.trim()) setInputError('');
                      }}
                      className="flex-1 text-xs md:text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none bg-transparent py-2.5 pr-2"
                      disabled={isStartingDebate}
                    />

                    {/* Launch Debate Action Arrow Button */}
                    <button
                      id="launch-debate-btn"
                      onClick={() => handleStartDebate(questionText)}
                      disabled={isStartingDebate || !questionText.trim() || questionText.length > 300}
                      className="accent-gradient disabled:bg-zinc-800 text-white p-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      {isStartingDebate ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="text-xs font-semibold px-1.5">Start Arena</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {inputError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rose-500 font-semibold flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {inputError}
                    </motion.p>
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {/* LIVE STREAMING COURTROOM COURT GAME SCREEN */}
          {currentScreen === 'live' && activeDebateId && (
            <motion.div
              key="live"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {(() => {
                const activeDebate = debates.find(d => d.id === activeDebateId);
                if (!activeDebate) return <div className="p-8 text-center text-xs">Debate record mismatch.</div>;
                return (
                  <LiveDebateView
                    debate={activeDebate}
                    onDebateComplete={handleUpdateDebate}
                    onNavigateToVerdict={() => setCurrentScreen('verdict')}
                  />
                );
              })()}
            </motion.div>
          )}

          {/* FINAL DECISION DECISION DECREE SCREEN */}
          {currentScreen === 'verdict' && activeDebateId && (
            <motion.div
              key="verdict"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {(() => {
                const activeDebate = debates.find(d => d.id === activeDebateId);
                if (!activeDebate) return <div className="p-8 text-center text-xs">Debate record mismatch.</div>;
                return (
                  <VerdictView
                    debate={activeDebate}
                    onStartNewDebate={handleNewDebateTrigger}
                    onStartChainedDebate={(newQuestion) => {
                      // Launching a chained follow-up debate carries the same model settings over!
                      setQuestionText(newQuestion);
                      handleStartDebate(newQuestion);
                    }}
                  />
                );
              })()}
            </motion.div>
          )}
          
          {/* LIBRARY SCREEN */}
          {currentScreen === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <LibraryView debates={debates} onSelectDebate={handleSelectDebate} />
            </motion.div>
          )}
          
          {/* ANALYTICS SCREEN */}
          {currentScreen === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <AnalyticsView onBack={handleNewDebateTrigger} />
            </motion.div>
          )}

        </AnimatePresence>

        {/* Quota Indicator Footer */}
        {quotaData && (
          <div className="absolute bottom-2 right-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800 flex items-center gap-2 font-mono text-[9px] text-zinc-500 z-10 shadow-sm pointer-events-none">
            <span className={`w-1.5 h-1.5 rounded-full ${
              (quotaData.rpm_limit - quotaData.rpm_available) / quotaData.rpm_limit > 0.8 
                ? 'bg-rose-500' 
                : (quotaData.rpm_limit - quotaData.rpm_available) / quotaData.rpm_limit > 0.6 
                  ? 'bg-amber-500' 
                  : 'bg-emerald-500'
            }`} />
            <span>RPM: {Math.floor(quotaData.rpm_limit - quotaData.rpm_available)}/{quotaData.rpm_limit}</span>
            <span>•</span>
            <span>RPD: {Math.floor(quotaData.rpd_limit - quotaData.rpd_available)}/{quotaData.rpd_limit}</span>
          </div>
        )}
      </main>

      {/* 3. MULTI-MODEL CONFIGURATION SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rounds={rounds}
        setRounds={setRounds}
        tone={tone}
        setTone={setTone}
        modelFor={modelFor}
        setModelFor={setModelFor}
        modelAgainst={modelAgainst}
        setModelAgainst={setModelAgainst}
        modelJudge={modelJudge}
        setModelJudge={setModelJudge}
      />
      
      {/* COMMAND PALETTE OVERLAY */}
      <AnimatePresence>
        {isCmdkOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCmdkOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center px-4 py-3 border-b border-zinc-800">
                <Search className="w-5 h-5 text-zinc-500 mr-3 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search commands, navigate debates..."
                  value={cmdSearch}
                  onChange={(e) => setCmdSearch(e.target.value)}
                  onKeyDown={handleCmdKeyDown}
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                />
                <div className="flex items-center gap-1 font-mono text-[9px] text-zinc-500 ml-3">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800">ESC</span> to close
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {cmdItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-500">No results found.</div>
                ) : (
                  cmdItems.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setCmdIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        idx === cmdIndex ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100'
                      }`}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
