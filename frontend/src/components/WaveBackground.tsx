import React, { useEffect, useRef } from 'react';

export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Configuration for the wave lines (similar to the requested purple abstract wave)
    const linesCount = 30;
    
    const render = () => {
      time += 0.005; // Speed of the wave
      
      // Clear the canvas with a solid dark background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1;
      
      // Draw multiple overlapping sine waves to create the 3D ribbon effect
      for (let i = 0; i < linesCount; i++) {
        ctx.beginPath();
        
        // Calculate dynamic colors (purple to magenta tones)
        const alpha = 1 - (i / linesCount);
        ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.15})`; // Purple base
        
        const yOffset = (canvas.height / 2) + Math.sin(time + i * 0.1) * 50;
        
        for (let x = 0; x < canvas.width; x += 10) {
          // Complex sine wave formula for ribbon-like structure
          const wave1 = Math.sin(x * 0.002 + time) * 150;
          const wave2 = Math.cos(x * 0.005 + time + i * 0.1) * (100 + i * 5);
          const wave3 = Math.sin(x * 0.01 - time) * 50;
          
          const y = yOffset + wave1 + wave2 + wave3;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-80"
      style={{ background: '#050505' }}
    />
  );
}
