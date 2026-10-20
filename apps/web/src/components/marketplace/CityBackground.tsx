'use client';

import React, { useEffect, useState, useMemo } from 'react';

// Generador pseudo-aleatorio determinista Mulberry32
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface StarData {
  left: string;
  top: string;
  width: string;
  height: string;
  background: string;
  animationDuration: string;
  animationDelay: string;
}

interface DistantRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type StructureConfig =
  | { type: 'house'; x: number; w: number; h: number }
  | { type: 'building'; x: number; w: number; h: number; floors: number }
  | { type: 'field'; x: number; w: number; h: number };

const GROUND_Y = 520;

export function CityBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generación determinista de estrellas y edificios
  const { stars, distantRects, structuresData } = useMemo(() => {
    const starRand = mulberry32(7);
    const starColors = ['#B7904D', '#9FB4FF', '#D8B876'];
    const generatedStars: StarData[] = [];

    for (let i = 0; i < 55; i++) {
      const size = 1.5 + starRand() * 2;
      generatedStars.push({
        left: `${(starRand() * 100).toFixed(2)}%`,
        top: `${(starRand() * 85).toFixed(2)}%`,
        width: `${size}px`,
        height: `${size}px`,
        background: starColors[Math.floor(starRand() * starColors.length)],
        animationDuration: `${(3 + starRand() * 5).toFixed(2)}s`,
        animationDelay: `${(-starRand() * 6).toFixed(2)}s`,
      });
    }

    const rand = mulberry32(1337);
    const generatedDistant: DistantRect[] = [];
    for (let x = -20; x < 1650; x += 78) {
      const w = 46 + rand() * 34;
      const h = 26 + rand() * 110;
      generatedDistant.push({
        x: x + rand() * 14,
        y: GROUND_Y - h,
        width: w,
        height: h,
      });
    }

    const structureList: StructureConfig[] = [
      { type: 'house', x: 20, w: 70, h: 60 },
      { type: 'house', x: 100, w: 60, h: 50 },
      { type: 'building', x: 175, w: 95, h: 190, floors: 6 },
      { type: 'building', x: 280, w: 75, h: 260, floors: 8 },
      { type: 'house', x: 365, w: 65, h: 55 },
      { type: 'building', x: 445, w: 100, h: 150, floors: 5 },
      { type: 'building', x: 565, w: 80, h: 320, floors: 10 },
      { type: 'building', x: 665, w: 95, h: 210, floors: 7 },
      { type: 'house', x: 775, w: 60, h: 50 },
      { type: 'building', x: 850, w: 80, h: 180, floors: 6 },
      { type: 'field', x: 945, w: 360, h: 130 },
      { type: 'building', x: 1330, w: 90, h: 240, floors: 8 },
      { type: 'building', x: 1435, w: 75, h: 160, floors: 5 },
      { type: 'house', x: 1520, w: 65, h: 55 },
    ];

    const generatedStructures = structureList.map((s) => {
      const dur = `${(5.5 + rand() * 4).toFixed(2)}s`;
      const delay = `${(-rand() * 9).toFixed(2)}s`;
      const yTop = GROUND_Y - s.h;
      const cx = s.x + s.w / 2;

      if (s.type === 'building') {
        const cols = Math.max(2, Math.round(s.w / 26));
        const margin = 8;
        const gap = 6;
        const ww = (s.w - 2 * margin - (cols - 1) * gap) / cols;
        const wh = (s.h - 2 * margin - (s.floors - 1) * gap) / s.floors;
        const windows: Array<{
          x: number;
          y: number;
          w: number;
          h: number;
          lit: boolean;
          dur: string;
          delay: string;
        }> = [];

        for (let r = 0; r < s.floors; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = s.x + margin + c * (ww + gap);
            const wy = yTop + margin + r * (wh + gap);
            const lit = rand() < 0.55;
            windows.push({
              x: wx,
              y: wy,
              w: Math.max(2, ww),
              h: Math.max(2, wh),
              lit,
              dur: `${(2.5 + rand() * 3.5).toFixed(2)}s`,
              delay: `${(-rand() * 4).toFixed(2)}s`,
            });
          }
        }

        const craneTop = yTop - 55;
        return {
          ...s,
          dur,
          delay,
          yTop,
          cx,
          isNavyMid: rand() < 0.5,
          windows,
          craneTop,
        };
      }

      if (s.type === 'house') {
        const roofH = s.h * 0.45;
        const w1Dur = `${(3 + rand() * 3).toFixed(2)}s`;
        const w1Delay = `${(-rand() * 4).toFixed(2)}s`;
        const w2Dur = `${(3 + rand() * 3).toFixed(2)}s`;
        const w2Delay = `${(-rand() * 4).toFixed(2)}s`;
        const craneTop = yTop - 55;
        return {
          ...s,
          dur,
          delay,
          yTop,
          cx,
          roofH,
          w1Dur,
          w1Delay,
          w2Dur,
          w2Delay,
          craneTop,
        };
      }

      // field
      return {
        ...s,
        dur,
        delay,
        yTop,
        cx,
      };
    });

    return {
      stars: generatedStars,
      distantRects: generatedDistant,
      structuresData: generatedStructures,
    };
  }, []);

  if (!mounted) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-90 transition-opacity duration-700"
        style={{ background: 'var(--city-bg)' }}
        role="presentation"
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden transition-colors duration-700"
      style={{ background: 'var(--city-bg)' }}
      role="presentation"
    >
      {/* Resplandor solar Sun Glow (solo en Modo Claro) */}
      <div className="sun-glow pointer-events-none dark:hidden" />

      {/* Capa de Estrellas Parpadeantes (solo en Modo Oscuro) */}
      <div className="pointer-events-none absolute inset-0 z-0 hidden dark:block">
        {stars.map((star, idx) => (
          <div
            key={`star-${idx}`}
            className="city-bg-star"
            style={{
              left: star.left,
              top: star.top,
              width: star.width,
              height: star.height,
              backgroundColor: star.background,
              animationDuration: star.animationDuration,
              animationDelay: star.animationDelay,
            }}
          />
        ))}
      </div>

      {/* Skyline de la Ciudad Animada en Construcción */}
      <div
        className="absolute left-0 right-0 bottom-0 h-[40vh] sm:h-[48vh] min-h-[260px] max-h-[480px] [mask-image:linear-gradient(to_top,black_55%,transparent_100%)] transition-opacity duration-700"
        style={{ opacity: 'var(--city-opacity)' }}
      >
        <svg
          viewBox="0 0 1650 640"
          preserveAspectRatio="xMidYMax slice"
          className="w-full h-full block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="hatch"
              width="8"
              height="8"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--city-hatch)" strokeWidth="2" />
            </pattern>
          </defs>

          {/* Skyline Distante Estático */}
          <g id="distantSkyline">
            {distantRects.map((d, i) => (
              <rect
                key={`distant-${i}`}
                x={d.x}
                y={d.y}
                width={d.width}
                height={d.height}
                className="city-bg-distant"
              />
            ))}
          </g>

          {/* Skyline en Construcción Animado */}
          <g id="citySkyline">
            {structuresData.map((s, idx) => {
              const customStyle = {
                '--dur': s.dur,
                '--delay': s.delay,
              } as React.CSSProperties;

              if (s.type === 'building') {
                return (
                  <React.Fragment key={`struct-bld-${idx}`}>
                    <g className="city-bg-structure" style={customStyle}>
                      <rect
                        x={s.x}
                        y={s.yTop}
                        width={s.w}
                        height={s.h}
                        fill={s.isNavyMid ? 'var(--city-bldg-fill-2)' : 'var(--city-bldg-fill-1)'}
                      />
                      <g className="city-bg-details" style={customStyle}>
                        {s.windows.map((w, wi) => (
                          <rect
                            key={`win-${wi}`}
                            x={w.x}
                            y={w.y}
                            width={w.w}
                            height={w.h}
                            rx={1}
                            fill={w.lit ? 'var(--city-window-lit)' : 'var(--city-window-off)'}
                            className={w.lit ? 'city-bg-lit-window' : undefined}
                            style={
                              w.lit
                                ? {
                                    animationDuration: w.dur,
                                    animationDelay: w.delay,
                                  }
                                : undefined
                            }
                          />
                        ))}
                      </g>
                      <rect
                        x={s.x}
                        y={s.yTop}
                        width={s.w}
                        height={s.h}
                        className="city-bg-scaffold"
                        style={customStyle}
                      />
                    </g>
                    {/* Grúa del Edificio */}
                    <g className="city-bg-crane" style={customStyle}>
                      <line x1={s.cx - 16} y1={GROUND_Y} x2={s.cx - 16} y2={s.craneTop} />
                      <line x1={s.cx - 16} y1={s.craneTop} x2={s.cx + 34} y2={s.craneTop} />
                      <line x1={s.cx - 16} y1={s.craneTop} x2={s.cx - 30} y2={s.craneTop + 14} />
                      <line x1={s.cx + 26} y1={s.craneTop} x2={s.cx + 26} y2={s.craneTop + 16} />
                    </g>
                  </React.Fragment>
                );
              }

              if (s.type === 'house') {
                return (
                  <React.Fragment key={`struct-house-${idx}`}>
                    <g className="city-bg-structure" style={customStyle}>
                      <rect
                        x={s.x}
                        y={s.yTop + s.roofH * 0.4}
                        width={s.w}
                        height={s.h - s.roofH * 0.4}
                        fill="var(--city-bldg-fill-1)"
                      />
                      <polygon
                        points={`${s.x - 6},${s.yTop + s.roofH * 0.4} ${s.cx},${s.yTop - s.roofH * 0.6} ${s.x + s.w + 6},${s.yTop + s.roofH * 0.4}`}
                        fill="var(--city-roof-gold)"
                      />
                      <g className="city-bg-details" style={customStyle}>
                        <rect
                          x={s.cx - 6}
                          y={GROUND_Y - 22}
                          width={12}
                          height={22}
                          fill="var(--city-window-off)"
                        />
                        <rect
                          x={s.x + 8}
                          y={s.yTop + s.roofH * 0.4 + 10}
                          width={14}
                          height={14}
                          fill="var(--city-window-lit)"
                          className="city-bg-lit-window"
                          style={{
                            animationDuration: s.w1Dur,
                            animationDelay: s.w1Delay,
                          }}
                        />
                        <rect
                          x={s.x + s.w - 22}
                          y={s.yTop + s.roofH * 0.4 + 10}
                          width={14}
                          height={14}
                          fill="var(--city-window-lit)"
                          className="city-bg-lit-window"
                          style={{
                            animationDuration: s.w2Dur,
                            animationDelay: s.w2Delay,
                          }}
                        />
                      </g>
                      <rect
                        x={s.x}
                        y={s.yTop - s.roofH * 0.6}
                        width={s.w}
                        height={s.h + s.roofH}
                        className="city-bg-scaffold"
                        style={customStyle}
                      />
                    </g>
                    {/* Grúa de la Casa */}
                    <g className="city-bg-crane" style={customStyle}>
                      <line x1={s.cx - 16} y1={GROUND_Y} x2={s.cx - 16} y2={s.craneTop} />
                      <line x1={s.cx - 16} y1={s.craneTop} x2={s.cx + 34} y2={s.craneTop} />
                      <line x1={s.cx - 16} y1={s.craneTop} x2={s.cx - 30} y2={s.craneTop + 14} />
                      <line x1={s.cx + 26} y1={s.craneTop} x2={s.cx + 26} y2={s.craneTop + 16} />
                    </g>
                  </React.Fragment>
                );
              }

              if (s.type === 'field') {
                return (
                  <g key={`struct-field-${idx}`} className="city-bg-structure" style={customStyle}>
                    <rect
                      x={s.x}
                      y={s.yTop}
                      width={s.w}
                      height={s.h}
                      fill="var(--city-bldg-fill-2)"
                      rx={4}
                    />
                    <g
                      className="city-bg-details"
                      fill="none"
                      stroke="var(--city-window-lit)"
                      strokeWidth={2}
                      style={customStyle}
                    >
                      <rect x={s.x + 6} y={s.yTop + 6} width={s.w - 12} height={s.h - 12} />
                      <line x1={s.cx} y1={s.yTop + 6} x2={s.cx} y2={s.yTop + s.h - 6} />
                      <circle cx={s.cx} cy={s.yTop + s.h / 2} r={s.h * 0.22} fill="none" />
                      <rect
                        x={s.x + 6}
                        y={s.yTop + s.h * 0.28}
                        width={s.w * 0.08}
                        height={s.h * 0.44}
                      />
                      <rect
                        x={s.x + s.w - 6 - s.w * 0.08}
                        y={s.yTop + s.h * 0.28}
                        width={s.w * 0.08}
                        height={s.h * 0.44}
                      />
                    </g>
                    <rect
                      x={s.x}
                      y={s.yTop}
                      width={s.w}
                      height={s.h}
                      className="city-bg-scaffold"
                      style={customStyle}
                    />
                  </g>
                );
              }

              return null;
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default CityBackground;
