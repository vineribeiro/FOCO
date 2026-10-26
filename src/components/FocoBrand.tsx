import React from 'react';

/**
 * FOCO Official Monogram & Brand Assets
 * Geometrically constructed according to the official FOCO Fitness Premium brand identity guidelines.
 * Palette: #0A0A0A (Preto Profundo), #292929 (Grafite), #858585 (Cinza Médio), #E5E5E5 (Cinza Claro), #FFFFFF (Branco)
 */

export const FOCO_PALETTE = {
  black: '#0A0A0A',
  darkGray: '#161616',
  graphite: '#292929',
  mediumGray: '#858585',
  lightGray: '#E5E5E5',
  white: '#FFFFFF',
};

interface SymbolProps {
  className?: string;
  color?: string;
  size?: number;
}

/**
 * Official F Monogram:
 * Two aerodynamic, speed-angled parallel wings forming the letter 'F'.
 * Clean geometric cuts, precision chamfers, high-contrast performance aesthetic.
 */
export const FocoSymbol: React.FC<SymbolProps> = ({
  className = 'w-8 h-8',
  color = 'currentColor',
}) => {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FOCO Monogram F"
    >
      {/* Top Wing / Upper Arm of F */}
      <path
        d="M 52 38 L 84 6 L 154 6 L 128 32 L 80 32 L 52 38 Z"
        fill={color}
      />
      {/* Dynamic Main Body: Lower Wing & Angled Stem */}
      <path
        d="M 6 84 L 54 36 L 138 36 L 112 62 L 72 62 L 40 94 L 6 94 Z"
        fill={color}
      />
    </svg>
  );
};

/**
 * Refined Monogram matching the reference image grid:
 * Upper chevron blade + Lower angled blade with parallel negative gap
 */
export const FocoMonogram: React.FC<SymbolProps> = ({
  className = 'w-10 h-10',
  color = 'currentColor',
}) => {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Upper blade of the F */}
      <path
        d="M 58 56 L 94 20 L 194 20 L 162 52 L 102 52 L 76 78 L 58 56 Z"
        fill={color}
      />
      {/* Lower blade / stem of the F */}
      <path
        d="M 12 102 L 68 46 L 96 46 L 46 96 L 76 96 L 152 96 L 128 120 L 68 120 L 12 120 Z"
        fill={color}
      />
    </svg>
  );
};

/**
 * Geometric Vector FOCO Lettering
 * Wide athletic stance, heavy geometric strokes, rounded squircle corners
 */
export const FocoLettering: React.FC<SymbolProps> = ({
  className = 'h-6',
  color = 'currentColor',
}) => {
  return (
    <svg
      viewBox="0 0 380 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FOCO"
    >
      {/* F */}
      <path
        d="M 10 8 L 86 8 L 86 24 L 34 24 L 34 34 L 76 34 L 76 50 L 34 50 L 34 68 L 10 68 Z"
        fill={color}
      />
      {/* O (First) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 122 8 C 104 8 96 16 96 34 C 96 52 104 68 122 68 L 168 68 C 186 68 194 52 194 34 C 194 16 186 8 168 8 L 122 8 Z M 126 24 C 122 24 120 28 120 38 C 120 48 122 52 126 52 L 164 52 C 168 52 170 48 170 38 C 170 28 168 24 164 24 L 126 24 Z"
        fill={color}
      />
      {/* C */}
      <path
        d="M 292 24 L 292 8 L 230 8 C 212 8 204 16 204 34 C 204 52 212 68 230 68 L 292 68 L 292 52 L 234 52 C 230 52 228 48 228 38 C 228 28 230 24 234 24 L 292 24 Z"
        fill={color}
      />
      {/* O (Second) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 328 8 C 310 8 302 16 302 34 C 302 52 310 68 328 68 L 374 68 C 392 68 400 52 400 34 C 400 16 392 8 374 8 L 328 8 Z M 332 24 C 328 24 326 28 326 38 C 326 48 328 52 332 52 L 370 52 C 374 52 376 48 376 38 C 376 28 374 24 370 24 L 332 24 Z"
        fill={color}
      />
    </svg>
  );
};

/**
 * Signature 1: Horizontal Lockup ([F] FOCO)
 */
export const FocoLogoHorizontal: React.FC<{
  className?: string;
  symbolSize?: string;
  textColor?: string;
  symbolColor?: string;
  showSlogan?: boolean;
}> = ({
  className = 'flex items-center gap-3',
  symbolSize = 'w-9 h-9',
  textColor = 'text-white',
  symbolColor = '#FFFFFF',
  showSlogan = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Geometric Clean F SVG */}
      <svg
        viewBox="0 0 100 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${symbolSize} shrink-0`}
      >
        <path
          d="M 32 30 L 52 10 L 98 10 L 80 28 L 52 28 Z"
          fill={symbolColor}
        />
        <path
          d="M 4 58 L 32 30 L 76 30 L 60 46 L 38 46 L 24 60 L 4 60 Z"
          fill={symbolColor}
        />
      </svg>
      <div className="flex flex-col">
        <span className={`font-black text-xl tracking-[0.18em] uppercase ${textColor} leading-none font-sans`}>
          FOCO
        </span>
        {showSlogan && (
          <span className="text-[8px] font-bold tracking-[0.28em] text-neutral-400 uppercase mt-0.5">
            FOCO EM EVOLUIR.
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Signature 2: Vertical Lockup (Centered Símbolo on top, FOCO below)
 */
export const FocoLogoVertical: React.FC<{
  className?: string;
  symbolSize?: string;
  symbolColor?: string;
  textColor?: string;
  showSlogan?: boolean;
}> = ({
  className = 'flex flex-col items-center text-center',
  symbolSize = 'w-16 h-14',
  symbolColor = '#FFFFFF',
  textColor = 'text-white',
  showSlogan = true,
}) => {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Precision Angular Monogram */}
      <svg
        viewBox="0 0 100 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${symbolSize} mb-2.5`}
      >
        <path
          d="M 32 30 L 52 10 L 98 10 L 80 28 L 52 28 Z"
          fill={symbolColor}
        />
        <path
          d="M 4 58 L 32 30 L 76 30 L 60 46 L 38 46 L 24 60 L 4 60 Z"
          fill={symbolColor}
        />
      </svg>
      <span className={`font-black text-2xl tracking-[0.22em] uppercase ${textColor} leading-none`}>
        FOCO
      </span>
      {showSlogan && (
        <span className="text-[9px] font-bold tracking-[0.32em] text-neutral-400 uppercase mt-1.5">
          FOCO EM EVOLUIR.
        </span>
      )}
    </div>
  );
};
