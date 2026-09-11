import React from 'react';
import { SnapResult } from '../utils/snapEngine';

interface SnapIndicatorProps {
  snapResult: SnapResult | null;
  lang: 'fa' | 'en';
  visible: boolean;
}

/**
 * 3ds Max Style Snap Indicator (Glyph & Label)
 * Displays distinctive CAD-style snapping icons:
 * - Grid Intersection: Emerald green square with internal crosshair
 * - Vertex: Cyan box with corner ticks and center point
 * - Edge: Amber triangle / diamond with midpoint marker
 */
export const SnapIndicator: React.FC<SnapIndicatorProps> = ({ snapResult, lang, visible }) => {
  if (!visible || !snapResult) return null;

  const isFa = lang === 'fa';
  const { type, screenX, screenY, label, labelFa } = snapResult;

  const displayText = isFa ? labelFa : label;

  return (
    <div
      className="pointer-events-none fixed z-40 transition-transform duration-75 ease-out"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 1. Grid Intersection Glyph (3ds Max Green Crosshair Box) */}
      {type === 'grid' && (
        <div className="relative flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
          >
            {/* Outer Target Box */}
            <rect
              x="5"
              y="5"
              width="18"
              height="18"
              fill="rgba(16, 185, 129, 0.15)"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            {/* Center Crosshair + */}
            <line x1="14" y1="2" x2="14" y2="26" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="2.5" fill="#10b981" />
          </svg>

          {/* Coordinate Readout Tag */}
          <div
            className={`absolute top-full mt-2.5 whitespace-nowrap bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-emerald-500/40 text-[10px] font-mono font-medium text-emerald-300 shadow-xl ${
              isFa ? 'right-0' : 'left-0'
            }`}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-ping" />
            {displayText}
          </div>
        </div>
      )}

      {/* 2. Volume Vertex Glyph (3ds Max Cyan Target Box) */}
      {type === 'vertex' && (
        <div className="relative flex items-center justify-center">
          <svg
            width="30"
            height="30"
            viewBox="0 0 30 30"
            className="text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.9)] animate-bounce-subtle"
          >
            {/* Outer Box */}
            <rect
              x="6"
              y="6"
              width="18"
              height="18"
              fill="rgba(6, 182, 212, 0.2)"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            {/* Corner Bracket Accents */}
            <path
              d="M3 9 V3 H9 M21 3 H27 V9 M27 21 V27 H21 M9 27 H3 V21"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
            />
            {/* Center Vertex Dot */}
            <circle cx="15" cy="15" r="3" fill="#ffffff" stroke="#0891b2" strokeWidth="1" />
          </svg>

          {/* Vertex Info Tag */}
          <div
            className={`absolute top-full mt-2.5 whitespace-nowrap bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-cyan-500/50 text-[10px] font-mono font-medium text-cyan-200 shadow-xl ${
              isFa ? 'right-0' : 'left-0'
            }`}
          >
            <span className="text-cyan-400 font-bold mr-1">◆</span>
            {displayText}
          </div>
        </div>
      )}

      {/* 3. Volume Edge / Midpoint Glyph (3ds Max Amber Triangle) */}
      {type === 'edge' && (
        <div className="relative flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
          >
            {/* Triangle Midpoint Marker */}
            <polygon
              points="14,4 25,23 3,23"
              fill="rgba(245, 158, 11, 0.2)"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="14" cy="16" r="2.5" fill="#f59e0b" />
          </svg>

          {/* Edge Info Tag */}
          <div
            className={`absolute top-full mt-2.5 whitespace-nowrap bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-amber-500/40 text-[10px] font-mono font-medium text-amber-200 shadow-xl ${
              isFa ? 'right-0' : 'left-0'
            }`}
          >
            <span className="text-amber-400 mr-1">▲</span>
            {displayText}
          </div>
        </div>
      )}
    </div>
  );
};
