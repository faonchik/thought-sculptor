import React from 'react';
import type { AcousticFeatures } from '../../types';

interface TechnicalAcousticOverlayProps {
  features: AcousticFeatures | null;
  pitch: number;
  rms: number;
  centroid: number;
  materialName: string;
  isRecording: boolean;
}

export const TechnicalAcousticOverlay: React.FC<TechnicalAcousticOverlayProps> = ({
  features,
  pitch,
  rms,
  centroid: _centroid,
  materialName,
  isRecording: _isRecording,
}) => {
  const displayPitch = pitch > 30 ? Math.round(pitch) : 175;
  const displayFlux = features ? features.spectralFlux.toFixed(3) : '0.245';
  const waveAmp = Math.max(5, Math.min(17, Math.round(rms * 28)));

  return (
    <div className="ed-technical-overlay">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1000 800"
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Subtle gradient for paper fold crease */}
          <linearGradient id="foldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(20,21,24,0)" />
            <stop offset="48%" stopColor="rgba(20,21,24,0.015)" />
            <stop offset="50%" stopColor="rgba(20,21,24,0.035)" />
            <stop offset="52%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(20,21,24,0)" />
          </linearGradient>

          {/* Micro-plate texture patterns */}
          <pattern id="grainPattern" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#E8E5DD" />
            <circle cx="1" cy="1" r="0.6" fill="rgba(20,21,24,0.2)" />
            <circle cx="3" cy="2.5" r="0.4" fill="rgba(186,93,56,0.25)" />
          </pattern>
          <pattern id="strataPattern" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#EAE7DF" />
            <line x1="0" y1="2" x2="6" y2="2" stroke="rgba(20,21,24,0.18)" strokeWidth="0.6" />
            <line x1="0" y1="5" x2="6" y2="5" stroke="rgba(20,21,24,0.12)" strokeWidth="0.4" />
          </pattern>
          <pattern id="crustPattern" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#E4E0D6" />
            <path d="M 0 3 Q 3 1 6 3" fill="none" stroke="rgba(20,21,24,0.22)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* ===================================================================
            1. ARCHIVAL PAPER FOLD CREASE & WATERMARK (STRATA Reference)
            =================================================================== */}
        {/* Archival central vertical sheet fold */}
        <rect x="496" y="80" width="8" height="640" fill="url(#foldGradient)" pointerEvents="none" />
        <line x1="500" y1="80" x2="500" y2="720" stroke="rgba(20,21,24,0.06)" strokeDasharray="3 6" strokeWidth="0.5" />

        {/* Large Subtle Watermark Typography */}
        <text
          x="780"
          y="180"
          textAnchor="end"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontSize="72"
          fontWeight="300"
          letterSpacing="0.18em"
          fill="rgba(20,21,24,0.03)"
          pointerEvents="none"
        >
          STRATA
        </text>
        <text
          x="230"
          y="685"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="48"
          fontWeight="200"
          letterSpacing="0.08em"
          fill="rgba(20,21,24,0.025)"
          pointerEvents="none"
        >
          A-421
        </text>

        {/* ===================================================================
            2. TOPOGRAPHIC CONTOUR ELEVATION ISOBARS (STRATA Reference)
            Delicate organic curves flowing across the background around the rock
            =================================================================== */}
        <g fill="none" strokeWidth="0.65" pointerEvents="none">
          {/* Contour Line 1: Outer wide isobar */}
          <path
            d="M 230,220 C 310,210 390,160 500,160 C 610,160 690,210 770,230"
            stroke="rgba(20,21,24,0.08)"
            strokeDasharray="4 4"
          />
          {/* Contour Line 2: Cobalt accent curve (STRATA signature blue line) */}
          <path
            d="M 220,310 C 320,300 360,240 450,230 C 540,220 640,260 780,280"
            stroke="rgba(43,76,126,0.18)"
          />
          {/* Contour Line 3: Mid-elevation wrapping loop */}
          <path
            d="M 215,390 C 280,380 340,320 370,290 C 400,260 480,270 540,290 C 610,310 680,360 785,350"
            stroke="rgba(20,21,24,0.07)"
          />
          {/* Contour Line 4: Basal isobar */}
          <path
            d="M 225,480 C 310,470 340,510 420,530 C 500,550 580,520 660,490 C 720,470 750,490 780,500"
            stroke="rgba(20,21,24,0.07)"
          />
          {/* Contour Line 5: Footing isobar with small elevation tag */}
          <path
            d="M 230,560 C 330,550 420,610 520,610 C 620,610 700,560 775,570"
            stroke="rgba(43,76,126,0.14)"
            strokeDasharray="2 3"
          />
        </g>

        {/* Small elevation isobar labels */}
        <text x="772" y="278" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(43,76,126,0.45)">+140m</text>
        <text x="777" y="568" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(43,76,126,0.45)">-60m</text>

        {/* ===================================================================
            3. AUDIO WAVEFORM DISPERSION STRIP (Escape Reference)
            Upper-left area under the title: real-time harmonic oscillation curve
            =================================================================== */}
        <g transform="translate(225, 240)">
          {/* Boundary box hairline */}
          <rect x="0" y="0" width="135" height="42" fill="rgba(247,245,241,0.5)" stroke="rgba(20,21,24,0.10)" strokeWidth="0.5" />
          <line x1="0" y1="21" x2="135" y2="21" stroke="rgba(20,21,24,0.08)" strokeDasharray="2 2" strokeWidth="0.5" />

          {/* Sine wave oscillator reacting to sound level */}
          <path
            d={`M 5,21 Q 15,${21 - waveAmp} 25,21 T 45,21 T 65,21 T 85,21 T 105,21 T 125,21`}
            fill="none"
            stroke="rgba(20,21,24,0.45)"
            strokeWidth="0.75"
          />

          {/* Micro amplitude peaks */}
          <circle cx="25" cy="21" r="1.5" fill="#BA5D38" />
          <circle cx="65" cy="21" r="1.5" fill="#141518" />
          <circle cx="105" cy="21" r="1.5" fill="#BA5D38" />

          {/* Waveform mini tags */}
          <text x="4" y="9" fontSize="6.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.45)">
            HARMONIC OSCILLOGRAM // F₀ {displayPitch}Hz
          </text>
          <text x="4" y="38" fontSize="6" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.35)">
            SAMP: 48kHz • PHASE 0.42π
          </text>
        </g>

        {/* ===================================================================
            4. VERTICAL CALIPER MEASUREMENT RULER (Akira Reference)
            Right vertical datum axis with metric millimeter intervals
            =================================================================== */}
        <g transform="translate(765, 300)">
          <line x1="0" y1="0" x2="0" y2="200" stroke="rgba(20,21,24,0.18)" strokeWidth="0.6" />
          {Array.from({ length: 21 }).map((_, i) => {
            const y = i * 10;
            const isMajor = i % 5 === 0;
            return (
              <g key={`ruler_${i}`}>
                <line
                  x1="0"
                  y1={y}
                  x2={isMajor ? 8 : 4}
                  y2={y}
                  stroke={isMajor ? 'rgba(20,21,24,0.35)' : 'rgba(20,21,24,0.15)'}
                  strokeWidth={isMajor ? '0.75' : '0.5'}
                />
                {isMajor && (
                  <text
                    x="12"
                    y={y + 2.5}
                    fontSize="6.5"
                    fontFamily="'JetBrains Mono', monospace"
                    fill="rgba(20,21,24,0.4)"
                  >
                    {(100 - i * 10).toString().padStart(3, '+')}mm
                  </text>
                )}
              </g>
            );
          })}
          <text
            x="2"
            y="-8"
            fontSize="7"
            fontFamily="'JetBrains Mono', monospace"
            fill="rgba(20,21,24,0.45)"
            letterSpacing="0.05em"
          >
            CALIPER AXIS [Z]
          </text>
        </g>

        {/* ===================================================================
            5. SCIENTIFIC INSET SPECIMEN PLATES (STRATA Reference Bottom-Left)
            3 micro-inspection squares with photographic grain and technical tags
            =================================================================== */}
        <g transform="translate(225, 535)">
          <text x="0" y="-8" fontSize="7" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.45)" letterSpacing="0.06em">
            [CORE SPECIMEN MACRO-INSPECTION // 50X]
          </text>

          {/* Micro Plate 1: Grain Porosity */}
          <g transform="translate(0, 0)">
            <rect x="0" y="0" width="38" height="38" fill="url(#grainPattern)" stroke="rgba(20,21,24,0.2)" strokeWidth="0.6" />
            <rect x="0" y="42" width="38" height="12" fill="none" />
            <text x="0" y="48" fontSize="5.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.5)">PL-01</text>
            <text x="0" y="55" fontSize="5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.38)">POROUS 14μm</text>
          </g>

          {/* Micro Plate 2: Acoustic Strata */}
          <g transform="translate(48, 0)">
            <rect x="0" y="0" width="38" height="38" fill="url(#strataPattern)" stroke="rgba(20,21,24,0.2)" strokeWidth="0.6" />
            <text x="0" y="48" fontSize="5.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.5)">PL-02</text>
            <text x="0" y="55" fontSize="5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.38)">STRATA 84%</text>
          </g>

          {/* Micro Plate 3: Mineral Crust */}
          <g transform="translate(96, 0)">
            <rect x="0" y="0" width="38" height="38" fill="url(#crustPattern)" stroke="rgba(20,21,24,0.2)" strokeWidth="0.6" />
            <text x="0" y="48" fontSize="5.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.5)">PL-03</text>
            <text x="0" y="55" fontSize="5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.38)">{materialName.slice(0, 7).toUpperCase()}</text>
          </g>
        </g>

        {/* ===================================================================
            6. CENTRAL DATUM CALIPER & CONCENTRIC ORBITS
            =================================================================== */}
        {/* Central datum axes: ultra-thin dashed crosshair */}
        <g stroke="rgba(20,21,24,0.09)" strokeWidth="0.5">
          <line x1="500" y1="130" x2="500" y2="670" strokeDasharray="3 5" />
          <line x1="230" y1="400" x2="770" y2="400" strokeDasharray="3 5" />
        </g>

        {/* Delicate Concentric Caliper Rings */}
        <circle
          cx="500"
          cy="400"
          r="255"
          fill="none"
          stroke="rgba(20,21,24,0.10)"
          strokeWidth="0.6"
          strokeDasharray="4 6"
        />
        <circle
          cx="500"
          cy="400"
          r="195"
          fill="none"
          stroke="rgba(20,21,24,0.06)"
          strokeWidth="0.5"
        />
        <circle
          cx="500"
          cy="400"
          r="135"
          fill="none"
          stroke="rgba(20,21,24,0.05)"
          strokeWidth="0.5"
          strokeDasharray="2 3"
        />

        {/* Caliper Radial Ticks & Angle Markers */}
        <g transform="translate(500, 400)">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 15 * Math.PI) / 180;
            const r1 = 252;
            const r2 = i % 2 === 0 ? 260 : 256;
            const x1 = Math.cos(angle) * r1;
            const y1 = Math.sin(angle) * r1;
            const x2 = Math.cos(angle) * r2;
            const y2 = Math.sin(angle) * r2;
            return (
              <line
                key={`tick_${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={i % 6 === 0 ? 'rgba(186,93,56,0.55)' : 'rgba(20,21,24,0.14)'}
                strokeWidth={i % 6 === 0 ? '0.75' : '0.5'}
              />
            );
          })}

          {/* Minimal Angle Markers */}
          <text x="266" y="3" fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.38)">0°</text>
          <text x="-4" y="-263" fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.38)">90°</text>
          <text x="-280" y="3" fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.38)">180°</text>
          <text x="-8" y="271" fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.38)">270°</text>
        </g>

        {/* ===================================================================
            7. THREE PRECISE ANATOMICAL LEADER LINES
            =================================================================== */}
        {/* Callout 01: Apex Crown */}
        <g>
          <rect x="506" y="258" width="3" height="3" fill="#BA5D38" />
          <polyline
            points="508,259 625,200 735,200"
            fill="none"
            stroke="rgba(20,21,24,0.24)"
            strokeWidth="0.65"
          />
          <circle cx="735" cy="200" r="1.2" fill="#141518" />
        </g>

        {/* Callout 02: Lateral Strata */}
        <g>
          <rect x="390" y="405" width="3" height="3" fill="#141518" />
          <polyline
            points="391,406 295,455 200,455"
            fill="none"
            stroke="rgba(20,21,24,0.24)"
            strokeWidth="0.65"
          />
          <circle cx="200" cy="455" r="1.2" fill="#141518" />
        </g>

        {/* Callout 03: Basal Plinth Foundation */}
        <g>
          <rect x="522" y="525" width="3" height="3" fill="#141518" />
          <polyline
            points="524,527 635,575 735,575"
            fill="none"
            stroke="rgba(20,21,24,0.24)"
            strokeWidth="0.65"
          />
          <circle cx="735" cy="575" r="1.2" fill="#141518" />
        </g>

        {/* Frame Brackets */}
        <path d="M 235,160 L 220,160 L 220,175" fill="none" stroke="rgba(20,21,24,0.2)" strokeWidth="0.6" />
        <path d="M 765,160 L 780,160 L 780,175" fill="none" stroke="rgba(20,21,24,0.2)" strokeWidth="0.6" />
        <path d="M 220,625 L 220,640 L 235,640" fill="none" stroke="rgba(20,21,24,0.2)" strokeWidth="0.6" />
        <path d="M 780,625 L 780,640 L 765,640" fill="none" stroke="rgba(20,21,24,0.2)" strokeWidth="0.6" />

        {/* Technical Minimal Axis Legend */}
        <text x="220" y="152" fontSize="8" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.36)" letterSpacing="0.06em">
          [FIG. 01 — MORPHOLOGICAL MONOLITH]
        </text>
        <text x="780" y="650" textAnchor="end" fontSize="8" fontFamily="'JetBrains Mono', monospace" fill="rgba(20,21,24,0.36)" letterSpacing="0.06em">
          DATUM // ELEV +0.42m
        </text>
      </svg>

      {/* HTML Callout Cards: concise 2 lines, positioned right at line ends */}
      <div
        className="ed-callout-card"
        style={{ top: 'calc(50% - 175px)', right: 'calc(50% - 375px)' }}
      >
        <span className="callout-tag">[01] Apex Resonance</span>
        <div className="callout-val">{displayPitch} Hz // Harmonic Crest</div>
      </div>

      <div
        className="ed-callout-card"
        style={{ top: 'calc(50% + 75px)', left: 'calc(50% - 390px)' }}
      >
        <span className="callout-tag">[02] Lateral Strata</span>
        <div className="callout-val">Flux {displayFlux} // Acoustic Shear</div>
      </div>

      <div
        className="ed-callout-card"
        style={{ top: 'calc(50% + 195px)', right: 'calc(50% - 375px)' }}
      >
        <span className="callout-tag">[03] Basal Mass</span>
        <div className="callout-val">4.12 kg // Stable Foundation</div>
      </div>
    </div>
  );
};


