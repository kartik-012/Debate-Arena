/**
 * IntroSplash — Premium branded boot-up sequence for Debate Arena.
 *
 * Timing: ~3.8s total sequence, 800ms smooth crossfade exit.
 * Colors: Transparent background (allows App grid to show), multi-line purple wave.
 * Exit: intro scales + fades WHILE Home simultaneously scales up from below.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimationFrame } from 'motion/react';

interface IntroSplashProps {
  onComplete: () => void;
  onExiting:  () => void;
}

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  steelBlue:   '#3A5A78',
  ink:         '#E8EBF0',
  inkDim:      '#4E5E78',
  gold:        '#B8902F',
  sideFor:     '#3B82F6',
  sideAgainst: '#8B5CF6',
  wave:        '#4D2B8A',   // Deep purple base for the multi-line wave
};

// ─── Easing ────────────────────────────────────────────────────────────────────
const EXPO_OUT: [number, number, number, number] = [0.16, 1.0, 0.30, 1.0];

// ─── Wordmark letters ──────────────────────────────────────────────────────────
const WORDMARK  = 'DEBATE ARENA';
const LETTERS   = WORDMARK.split('');
const STAGGER   = 0.045;

// ─── Animated SVG Wave behind wordmark ────────────────────────────────────────
// Creates a multi-line, fine, dark purple wave texture exactly like the screenshot
function BackgroundWave({ visible }: { visible: boolean }) {
  const [t, setT] = useState(0);

  useAnimationFrame((time) => {
    setT(time / 5000); 
  });

  const W = 1000;
  const H = 200;
  const cx = W / 2;
  const cy = H / 2;
  
  // Generate 8 fine parallel/overlapping wave lines
  const numLines = 8;
  const paths = Array.from({ length: numLines }).map((_, i) => {
    const pts: string[] = [];
    const amp = 15 + i * 4;       // Each line has a slightly different amplitude
    const freq = 1.8 + i * 0.05;  // Slight frequency shift creates the overlapping mesh look
    const phase = t * Math.PI * 2 + (i * 0.2); // Phase offset
    
    for (let x = 0; x <= W; x += 8) {
      const y = cy + amp * Math.sin((x / W) * Math.PI * 2 * freq + phase) + (i * 3 - (numLines * 1.5));
      pts.push(`${x},${y}`);
    }
    return `M${pts.join(' L')}`;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 0.35 : 0 }}
      transition={{ duration: 1.2 }}
      style={{
        position: 'absolute',
        width: '100%',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
      >
        {paths.map((d, i) => (
          <path 
            key={i} 
            d={d} 
            fill="none" 
            stroke={C.wave} 
            strokeWidth="0.8" 
            opacity={1 - (i * 0.08)} // Fade out the outer lines
          />
        ))}
      </svg>
    </motion.div>
  );
}

// ─── Letter-by-letter wordmark ─────────────────────────────────────────────────
function LetterReveal({ active }: { active: boolean }) {
  return (
    <div
      aria-label="Debate Arena"
      style={{
        display:       'flex',
        alignItems:    'baseline',
        fontFamily:    "'Fraunces', 'Georgia', serif",
        fontSize:      'clamp(3rem, 8vw, 7rem)',
        fontWeight:    900,
        letterSpacing: '0.05em',
        color:         C.ink,
        lineHeight:    1,
        userSelect:    'none',
        position:      'relative',
        zIndex:        2,
      }}
    >
      {LETTERS.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 28, rotateX: -30, filter: 'blur(4px)' }}
          animate={active
            ? { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }
            : { opacity: 0, y: 28, rotateX: -30, filter: 'blur(4px)' }
          }
          transition={{
            delay:    i * STAGGER,
            duration: 0.5,
            ease:     EXPO_OUT,
          }}
          style={{
            display:         'inline-block',
            whiteSpace:      letter === ' ' ? 'pre' : 'normal',
            transformOrigin: 'bottom center',
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function IntroSplash({ onComplete, onExiting }: IntroSplashProps) {
  const [stage,   setStage]   = useState<0|1|2|3|4>(0);
  const [visible, setVisible] = useState(true);
  const canSkip  = useRef(false);
  const didExit  = useRef(false);

  // ── Exit trigger ─────────────────────────────────────────────────────────────
  const startExit = useCallback(() => {
    if (didExit.current) return;
    didExit.current = true;
    setStage(4);
    onExiting();                        
    setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 800);                            // 800ms perfectly matches App's Home transition
  }, [onComplete, onExiting]);

  // ── Keyboard / click skip ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && canSkip.current) startExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startExit]);

  // ── Sequence timings (Total: 3.8s before auto-exit) ────────────────────────
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onExiting(); onComplete(); return;
    }

    const wordmarkEnd = LETTERS.length * STAGGER * 1000 + 500; 

    // Timing tuned to feel brisk but elegant (total ~3.8s)
    const t1 = setTimeout(() => setStage(1),  50);
    const t2 = setTimeout(() => setStage(2),  500);
    const t3 = setTimeout(() => setStage(3),  500 + wordmarkEnd + 150);
    const t4 = setTimeout(() => { canSkip.current = true; }, 700);
    const t5 = setTimeout(startExit, 3800);           // auto exit at 3.8s

    return () => { [t1, t2, t3, t4, t5].forEach(clearTimeout); };
  }, [startExit, onExiting, onComplete]);

  if (!visible) return null;

  const isExiting = stage === 4;

  return (
    <motion.div
      id="intro-splash-screen"
      onClick={() => { if (canSkip.current) startExit(); }}
      // ── Perfect 800ms overlapping crossfade exit ──────────────────────────────
      initial={{ opacity: 1, scale: 1.0 }}
      animate={isExiting
        ? { opacity: 0, scale: 0.95 }  
        : { opacity: 1, scale: 1.00 }
      }
      transition={isExiting
        ? { duration: 0.8, ease: 'easeInOut' }  // exact match to Home curve
        : { duration: 0 }
      }
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          200,
        background:      'transparent', // Transparent to let App's dark grid show through!
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        cursor:          'pointer',
        userSelect:      'none',
        overflow:        'hidden',
        transformOrigin: '50% 38%',
      }}
    >

      {/* ── Ambient radial glow — helps separate text from grid ────────────── */}
      <div style={{
        position:     'absolute', inset: 0, pointerEvents: 'none',
        background:   `radial-gradient(ellipse 70% 60% at 50% 50%, #050505 0%, transparent 75%)`,
      }} />

      {/* ── CENTER GROUP ──────────────────────────────────────────────────── */}
      <div style={{
        position:       'relative',
        zIndex:         2,
        textAlign:      'center',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
      }}>

        {/* ── Scales SVG — strokes draw in ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{
            opacity: stage >= 1 ? 1 : 0,
            scale:   stage >= 1 ? 1 : 0.8,
            y:       stage >= 1 ? 0 : 12,
          }}
          transition={{ duration: 0.6, ease: EXPO_OUT }}
          style={{ marginBottom: 32, position: 'relative' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: stage >= 1 ? 0.5 : 0, scale: stage >= 1 ? 1.2 : 0.5 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              position:     'absolute',
              width: 260, height: 260,
              borderRadius: '50%',
              background:   `radial-gradient(circle, ${C.steelBlue}30 0%, transparent 70%)`,
              filter:       'blur(50px)',
              top: '50%', left: '50%',
              transform:    'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />

          <svg
            width="72" height="86"
            viewBox="0 0 200 240"
            fill="none"
            stroke={C.ink}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'relative', filter: `drop-shadow(0 0 18px ${C.steelBlue}AA)` }}
          >
            <motion.path d="M100 20 L100 220"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
              transition={{ pathLength: { duration: 0.5, delay: 0.05, ease: 'easeInOut' }, opacity: { duration: 0.01 } }} />
            <motion.path d="M28 78 L172 78"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
              transition={{ pathLength: { duration: 0.5, delay: 0.15, ease: 'easeInOut' }, opacity: { duration: 0.01, delay: 0.15 } }} />
            <motion.path d="M42 78 L42 150"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
              transition={{ pathLength: { duration: 0.35, delay: 0.3, ease: 'easeOut' }, opacity: { duration: 0.01, delay: 0.3 } }} />
            <motion.path d="M158 78 L158 150"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
              transition={{ pathLength: { duration: 0.35, delay: 0.3, ease: 'easeOut' }, opacity: { duration: 0.01, delay: 0.3 } }} />
            <motion.path d="M10 150 Q42 178 74 150"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
              transition={{ pathLength: { duration: 0.4, delay: 0.45, ease: 'easeOut' }, opacity: { duration: 0.01, delay: 0.45 } }} />
            <motion.path d="M126 150 Q158 178 190 150"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
              transition={{ pathLength: { duration: 0.4, delay: 0.45, ease: 'easeOut' }, opacity: { duration: 0.01, delay: 0.45 } }} />
            <motion.path d="M68 222 L132 222"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
              transition={{ pathLength: { duration: 0.3, delay: 0.6, ease: 'easeOut' }, opacity: { duration: 0.01, delay: 0.6 } }} />
            <motion.circle cx="100" cy="78" r="5" fill={C.gold} stroke="none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
              transition={{ delay: 0.62, duration: 0.3, ease: EXPO_OUT }}
              style={{ filter: `drop-shadow(0 0 8px ${C.gold})` }} />
          </svg>
        </motion.div>

        {/* ── Wordmark + background wave wrapper ──────────────────────────── */}
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>

          <BackgroundWave visible={stage >= 2} />
          <LetterReveal active={stage >= 2} />
        </div>

        {/* ── Tagline ──────────────────────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: stage >= 3 ? 0.7 : 0, y: stage >= 3 ? 0 : 8 }}
          transition={{ duration: 0.6, ease: EXPO_OUT }}
          style={{
            fontFamily:    "'Source Sans 3', 'Source Sans Pro', sans-serif",
            fontSize:      '0.8rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color:         C.inkDim,
            marginTop:     16,
            marginBottom:  0,
          }}
        >
          Where AI argues both sides.
        </motion.p>

        {/* ── FOR / AGAINST convergence lines ─────────────────────────────── */}
        <div style={{
          marginTop:   22,
          display:     'flex',
          alignItems:  'center',
          width:       'min(520px, 82vw)',
        }}>

          <motion.span
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: stage >= 3 ? 0.9 : 0, x: stage >= 3 ? 0 : -14 }}
            transition={{ duration: 0.45, delay: 0.1, ease: EXPO_OUT }}
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.58rem',
              letterSpacing: '0.24em',
              color:         C.sideFor,
              textTransform: 'uppercase',
              marginRight:   14,
              flexShrink:    0,
            }}
          >
            FOR
          </motion.span>

          <div style={{ flex: 1, height: 1.5, overflow: 'hidden', borderRadius: 1 }}>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: stage >= 3 ? 1 : 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: EXPO_OUT }}
              style={{
                width: '100%', height: '100%',
                background:       `linear-gradient(to right, ${C.sideFor}BB, ${C.sideFor})`,
                transformOrigin: 'right center',
                boxShadow:        `0 0 8px ${C.sideFor}66`,
              }}
            />
          </div>

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: stage >= 3 ? 1 : 0, opacity: stage >= 3 ? 1 : 0 }}
            transition={{ duration: 0.35, delay: 0.6, ease: EXPO_OUT }}
            style={{
              width: 7, height: 7,
              borderRadius: '50%',
              backgroundColor: C.gold,
              boxShadow:       `0 0 12px ${C.gold}, 0 0 4px #fff5`,
              flexShrink: 0,
              margin: '0 6px',
            }}
          />

          <div style={{ flex: 1, height: 1.5, overflow: 'hidden', borderRadius: 1 }}>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: stage >= 3 ? 1 : 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: EXPO_OUT }}
              style={{
                width: '100%', height: '100%',
                background:       `linear-gradient(to left, ${C.sideAgainst}BB, ${C.sideAgainst})`,
                transformOrigin:  'left center',
                boxShadow:        `0 0 8px ${C.sideAgainst}66`,
              }}
            />
          </div>

          <motion.span
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: stage >= 3 ? 0.9 : 0, x: stage >= 3 ? 0 : 14 }}
            transition={{ duration: 0.45, delay: 0.1, ease: EXPO_OUT }}
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.58rem',
              letterSpacing: '0.24em',
              color:         C.sideAgainst,
              textTransform: 'uppercase',
              marginLeft:    14,
              flexShrink:    0,
            }}
          >
            AGAINST
          </motion.span>
        </div>
      </div>

      <AnimatePresence>
        {stage >= 3 && !isExiting && (
          <motion.div
            key="skip-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.32 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position:      'absolute',
              bottom:        28,
              left:          '50%',
              transform:     'translateX(-50%)',
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.58rem',
              letterSpacing: '0.24em',
              color:         C.inkDim,
              textTransform: 'uppercase',
              pointerEvents: 'none',
              whiteSpace:    'nowrap',
            }}
          >
            Click · Enter · Space to skip
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
