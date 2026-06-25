/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Volume2 } from 'lucide-react';

interface CourtroomSceneProps {
  activeSpeaker: 'for' | 'against' | 'judge' | 'idle';
  winningSide: 'for' | 'against' | null;
  status: 'in_progress' | 'judging' | 'complete' | 'error';
  is3DSupported?: boolean;
}

export default function CourtroomScene({
  activeSpeaker,
  winningSide,
  status,
  is3DSupported = true
}: CourtroomSceneProps) {
  const [is3D, setIs3D] = useState(is3DSupported);
  const [fps, setFps] = useState(60);
  const [hasFpsDegraded, setHasFpsDegraded] = useState(false);

  // Monitor screen size and FPS fallback
  useEffect(() => {
    // Mobile check
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIs3D(false);
      } else {
        setIs3D(is3DSupported);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    // FPS simulator/tracker for first 2 seconds as required by TRD
    const startTime = Date.now();
    let frameCount = 0;
    let animationFrameId: number;

    const trackFps = () => {
      frameCount++;
      const elapsed = Date.now() - startTime;
      if (elapsed < 2000) {
        animationFrameId = requestAnimationFrame(trackFps);
      } else {
        const measuredFps = Math.round((frameCount * 1000) / elapsed);
        setFps(measuredFps);
        if (measuredFps < 30) {
          // Low FPS detected -> automatically swap to flat 2D layout as required
          setHasFpsDegraded(true);
          setIs3D(false);
          console.warn(`Low FPS (${measuredFps}) detected. Auto-swapped to 2D layout.`);
        }
      }
    };

    animationFrameId = requestAnimationFrame(trackFps);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [is3DSupported]);

  // Determine camera transform based on debate state
  const getCameraStyle = () => {
    if (status === 'complete' && winningSide) {
      // Zoom and focus on the winner podium!
      return {
        scale: 1.25,
        x: winningSide === 'for' ? 120 : -120,
        y: 40,
        rotateX: 40,
        rotateZ: winningSide === 'for' ? -10 : 10,
      };
    }
    if (activeSpeaker === 'for') {
      return { scale: 1.05, x: 50, y: 10, rotateX: 35, rotateZ: -4 };
    }
    if (activeSpeaker === 'against') {
      return { scale: 1.05, x: -50, y: 10, rotateX: 35, rotateZ: 4 };
    }
    if (activeSpeaker === 'judge') {
      return { scale: 1.1, x: 0, y: -20, rotateX: 45, rotateZ: 0 };
    }
    return { scale: 1.0, x: 0, y: 0, rotateX: 35, rotateZ: 0 };
  };

  const cameraStyle = getCameraStyle();

  return (
    <div 
      id="courtroom-scene-container"
      className="relative w-full h-80 md:h-[400px] rounded-2xl overflow-hidden shadow-inner flex flex-col justify-between p-4 select-none border border-zinc-800"
      style={{ backgroundColor: '#09090b' }}
    >
      {/* Top Overlay Controls */}
      <div className="z-10 flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'complete' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'complete' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
          </span>
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
            {status === 'complete' ? 'Verdict Rendered' : status === 'judging' ? 'Judge Deliberating' : 'Court in Session'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* FPS Badge */}
          <span className="font-mono text-[10px] bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 text-zinc-500">
            {fps} FPS {hasFpsDegraded && '(Fallback 2D)'}
          </span>
          
          {/* 3D / 2D Manual Toggle (Only if screen is wide enough) */}
          <button 
            id="toggle-dimension-btn"
            onClick={() => setIs3D(!is3D)}
            disabled={window.innerWidth < 768}
            className="font-mono text-[10px] bg-zinc-900/80 border border-zinc-850 hover:border-zinc-755 text-zinc-400 px-2.5 py-1 rounded transition-colors disabled:opacity-50 cursor-pointer"
          >
            {is3D ? 'View 2D' : 'View 3D'}
          </button>
        </div>
      </div>

      {/* Main Render Stage */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {is3D ? (
          /* 3D PERSPECTIVE VIEWPORT */
          <motion.div
            id="viewport-3d"
            className="relative w-full h-full flex items-center justify-center"
            style={{ perspective: 1000 }}
          >
            <motion.div
              id="courtroom-stage"
              className="relative w-[600px] h-[300px] flex items-center justify-center origin-center"
              animate={{
                rotateX: cameraStyle.rotateX,
                rotateZ: cameraStyle.rotateZ,
                scale: cameraStyle.scale,
                x: cameraStyle.x,
                y: cameraStyle.y,
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 60 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Floor Plan & Center Aisle */}
              <div 
                className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-zinc-950 to-zinc-950/20 opacity-40 pointer-events-none"
                style={{ transform: 'translateZ(-50px)' }}
              />
              {/* Center Aisle Dividers */}
              <div 
                className="absolute w-1 h-[200px] bg-zinc-800/50 left-1/2 -translate-x-1/2 opacity-30"
                style={{ transform: 'translateZ(-49px)' }}
              />

              {/* JUDGE BENCH (Raised, Back-Center) */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 top-4 w-48 h-16 origin-bottom"
                style={{ transform: 'translateZ(10px) rotateX(0deg)', transformStyle: 'preserve-3d' }}
              >
                {/* Benchmark Extrusion */}
                <motion.div 
                  className={`w-full h-full rounded border-2 relative flex flex-col items-center justify-center transition-all duration-500 ${
                    activeSpeaker === 'judge' || status === 'judging'
                      ? 'bg-zinc-850 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Gavel / Scale Icon on Front */}
                  <Shield className={`w-6 h-6 transition-colors duration-500 ${
                    activeSpeaker === 'judge' || status === 'judging' ? 'text-amber-400' : 'text-zinc-600'
                  }`} />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 mt-1">THE JUDICIAL BENCH</span>

                  {/* Halo Light Beam for Judge */}
                  <AnimatePresence>
                    {(activeSpeaker === 'judge' || status === 'judging') && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.15, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-x-0 -top-40 h-40 bg-gradient-to-b from-amber-500 to-transparent pointer-events-none blur-md rounded-b-xl"
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* LEFT PODIUM: FOR (Glowing Blue) */}
              <div 
                className="absolute left-16 top-1/2 -translate-y-12 w-28 h-20"
                style={{ transform: 'translateZ(0px)', transformStyle: 'preserve-3d' }}
              >
                <motion.div
                  className={`w-full h-full rounded-lg border-2 p-3 flex flex-col justify-between transition-all duration-500 ${
                    activeSpeaker === 'for' 
                      ? 'bg-blue-950/80 border-blue-500 shadow-[0_0_35px_rgba(59,130,246,0.4)] scale-105' 
                      : status === 'complete' && winningSide === 'for'
                      ? 'bg-blue-950/80 border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.6)] scale-110'
                      : status === 'complete' && winningSide === 'against'
                      ? 'bg-zinc-950 border-zinc-900 opacity-20 scale-95'
                      : 'bg-zinc-900/60 border-blue-900/30'
                  }`}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`h-2 w-2 rounded-full ${activeSpeaker === 'for' ? 'bg-blue-400 animate-pulse' : 'bg-blue-800'}`} />
                    <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest">SIDE A</span>
                  </div>
                  <div className="text-left">
                    <div className="font-sans text-xs font-bold text-zinc-100">PRO-SIDE</div>
                    <div className="font-mono text-[9px] text-blue-400 mt-0.5">FOR THE MOTION</div>
                  </div>

                  {/* Blue Light Beam */}
                  <AnimatePresence>
                    {(activeSpeaker === 'for' || (status === 'complete' && winningSide === 'for')) && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.2, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-x-0 -top-48 h-48 bg-gradient-to-b from-blue-500 to-transparent pointer-events-none blur-sm rounded-b-xl"
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* RIGHT PODIUM: AGAINST (Glowing Purple) */}
              <div 
                className="absolute right-16 top-1/2 -translate-y-12 w-28 h-20"
                style={{ transform: 'translateZ(0px)', transformStyle: 'preserve-3d' }}
              >
                <motion.div
                  className={`w-full h-full rounded-lg border-2 p-3 flex flex-col justify-between transition-all duration-500 ${
                    activeSpeaker === 'against' 
                      ? 'bg-purple-950/80 border-purple-500 shadow-[0_0_35px_rgba(139,92,246,0.4)] scale-105' 
                      : status === 'complete' && winningSide === 'against'
                      ? 'bg-purple-950/80 border-purple-400 shadow-[0_0_50px_rgba(139,92,246,0.6)] scale-110'
                      : status === 'complete' && winningSide === 'for'
                      ? 'bg-zinc-950 border-zinc-900 opacity-20 scale-95'
                      : 'bg-zinc-900/60 border-purple-900/30'
                  }`}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest">SIDE B</span>
                    <span className={`h-2 w-2 rounded-full ${activeSpeaker === 'against' ? 'bg-purple-400 animate-pulse' : 'bg-purple-800'}`} />
                  </div>
                  <div className="text-right">
                    <div className="font-sans text-xs font-bold text-zinc-100">CON-SIDE</div>
                    <div className="font-mono text-[9px] text-purple-400 mt-0.5 font-medium">AGAINST MOTION</div>
                  </div>

                  {/* Purple Light Beam */}
                  <AnimatePresence>
                    {(activeSpeaker === 'against' || (status === 'complete' && winningSide === 'against')) && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.2, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-x-0 -top-48 h-48 bg-gradient-to-b from-purple-500 to-transparent pointer-events-none blur-sm rounded-b-xl"
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

            </motion.div>
          </motion.div>
        ) : (
          /* FLAT 2D CENTER-AXIS LAYOUT (Fallback/Responsive) */
          <div id="fallback-2d-canvas" className="w-full h-full flex items-center justify-around px-8 z-0 bg-[#09090b]">
            {/* Left 2D Column */}
            <div 
              className={`w-1/3 p-4 rounded-xl border flex flex-col justify-between h-44 transition-all duration-500 ${
                activeSpeaker === 'for'
                  ? 'bg-blue-950/80 border-blue-500 ring-2 ring-blue-500/50 scale-105'
                  : status === 'complete' && winningSide === 'for'
                  ? 'bg-blue-950/80 border-blue-500 scale-110 shadow-lg'
                  : status === 'complete' && winningSide === 'against'
                  ? 'opacity-20 scale-90 border-transparent bg-transparent'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-blue-400 font-bold">SIDE A</span>
                {activeSpeaker === 'for' && <Volume2 className="w-4 h-4 text-blue-400 animate-bounce" />}
              </div>
              <div>
                <h3 className="font-sans text-lg text-zinc-100 font-bold">Pro-Side (FOR)</h3>
                <p className="text-xs text-zinc-400 mt-1">Advocating the positive resolution</p>
              </div>
            </div>

            {/* Central Bench Aisle divider */}
            <div className="flex flex-col items-center gap-3">
              <div 
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 ${
                  activeSpeaker === 'judge' || status === 'judging'
                    ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <Shield className={`w-5 h-5 ${activeSpeaker === 'judge' || status === 'judging' ? 'text-amber-400' : 'text-zinc-500'}`} />
              </div>
              <div className="w-0.5 h-20 bg-zinc-800" />
            </div>

            {/* Right 2D Column */}
            <div 
              className={`w-1/3 p-4 rounded-xl border flex flex-col justify-between h-44 transition-all duration-500 ${
                activeSpeaker === 'against'
                  ? 'bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/50 scale-105'
                  : status === 'complete' && winningSide === 'against'
                  ? 'bg-purple-950/80 border-purple-500 scale-110 shadow-lg'
                  : status === 'complete' && winningSide === 'for'
                  ? 'opacity-20 scale-90 border-transparent bg-transparent'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}
            >
              <div className="flex justify-between items-center">
                {activeSpeaker === 'against' && <Volume2 className="w-4 h-4 text-purple-400 animate-bounce" />}
                <span className="font-mono text-[10px] text-purple-400 font-bold">SIDE B</span>
              </div>
              <div className="text-right">
                <h3 className="font-sans text-lg text-zinc-100 font-bold">Con-Side (AGAINST)</h3>
                <p className="text-xs text-zinc-400 mt-1 text-right">Advocating negative/status quo</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Speaker Label */}
      <div className="z-10 w-full flex justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {activeSpeaker !== 'idle' && (
            <motion.div
              key={activeSpeaker}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`px-4 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-wider shadow-lg flex items-center gap-2 ${
                activeSpeaker === 'for'
                  ? 'bg-blue-600 text-white border border-blue-400/30'
                  : activeSpeaker === 'against'
                  ? 'bg-purple-600 text-white border border-purple-400/30'
                  : 'bg-zinc-900 text-amber-400 border border-amber-500/30'
              }`}
            >
              {activeSpeaker === 'for' && <Sparkles className="w-3.5 h-3.5 animate-spin" />}
              {activeSpeaker === 'for' ? 'Side A is speaking' : activeSpeaker === 'against' ? 'Side B is speaking' : 'The Court is Deliberating'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
