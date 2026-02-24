import React from 'react';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import charGirlReading from '@/assets/char-girl-reading.png';
import charBoyPraying from '@/assets/char-boy-praying.png';
import charBoyChapelet from '@/assets/char-boy-chapelet.png';
import charGirlPraying from '@/assets/char-girl-praying.png';
import charGirlDua from '@/assets/char-girl-dua.png';
import charBoyReading from '@/assets/char-boy-reading.png';
import charGirlLantern from '@/assets/char-girl-lantern.png';
import charBoySalaam from '@/assets/char-boy-salaam.png';

const CHARACTER_IMAGES = [
  { src: charGirlReading, alt: 'Fille lisant le Coran' },
  { src: charBoyPraying, alt: 'Garçon en prière' },
  { src: charGirlDua, alt: 'Fille faisant dua' },
  { src: charBoyChapelet, alt: 'Garçon avec chapelet' },
  { src: charGirlLantern, alt: 'Fille avec lanterne' },
  { src: charBoyReading, alt: 'Garçon lisant le Coran' },
  { src: charGirlPraying, alt: 'Fille en prière' },
  { src: charBoySalaam, alt: 'Garçon qui salue' },
];

interface SouratePathViewProps {
  sourates: Array<{
    number: number;
    name_arabic: string;
    name_french: string;
    verses_count: number;
    revelation_type: string;
  }>;
  dbSourates: Map<number, number>;
  sourateProgress: Map<number, { is_validated: boolean; is_memorized: boolean; progress_percentage: number }>;
  isSourateAccessible: (num: number) => boolean;
  onSourateClick: (sourate: any) => void;
}

const ITEMS_PER_ROW = 5;
const WAVE_OFFSETS = [0, -10, -16, -10, 0];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const getStarColors = (sourateNum: number, isValidated: boolean): { fill: string; stroke: string; strokeWidth: number } => {
  if (isValidated) {
    return { fill: 'hsl(142, 70%, 45%)', stroke: 'hsl(35, 80%, 50%)', strokeWidth: 3 };
  }
  if (sourateNum === 1) {
    return { fill: 'hsl(140, 40%, 85%)', stroke: 'hsl(140, 30%, 70%)', strokeWidth: 1.5 };
  }

  let t: number;
  if (sourateNum >= 78) {
    t = (114 - sourateNum) / (114 - 78);
  } else {
    t = (77 - sourateNum) / (77 - 2);
  }

  const h = lerp(140, 35, t);
  const s = lerp(40, 70, t);
  const l = lerp(85, 72, t);
  const strokeL = lerp(70, 55, t);

  return {
    fill: `hsl(${h}, ${s}%, ${l}%)`,
    stroke: `hsl(${h}, ${s}%, ${strokeL}%)`,
    strokeWidth: 1.5,
  };
};

const StarBadge = ({
  number,
  isValidated,
  isAccessible,
  fill,
  stroke,
  strokeWidth,
  nameFrench,
  onClick,
}: {
  number: number;
  isValidated: boolean;
  isAccessible: boolean;
  fill: string;
  stroke: string;
  strokeWidth: number;
  nameFrench: string;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center transition-all duration-200',
        isAccessible && !isValidated && 'hover:scale-110',
        !isAccessible && 'cursor-not-allowed opacity-80'
      )}
      disabled={!isAccessible}
      style={{ width: 52 }}
    >
      <div className="relative w-11 h-11 flex items-center justify-center">
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-md">
          <path
            d="M24 2 L29.5 17.5 L46 17.5 L33 27.5 L37.5 44 L24 34 L10.5 44 L15 27.5 L2 17.5 L18.5 17.5 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
        <span className={cn(
          'absolute inset-0 flex items-center justify-center font-bold text-[9px] leading-none pt-0.5',
          isValidated ? 'text-white' : 'text-foreground/80'
        )}>
          {number}
        </span>
        {!isAccessible && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white shadow flex items-center justify-center">
            <Lock className="h-2 w-2 text-muted-foreground" />
          </div>
        )}
      </div>
      <span className="text-[7px] text-muted-foreground text-center leading-tight mt-0.5 w-full truncate">
        {nameFrench}
      </span>
    </button>
  );
};

const SouratePathView = ({
  sourates,
  dbSourates,
  sourateProgress,
  isSourateAccessible,
  onSourateClick,
}: SouratePathViewProps) => {
  const rows: typeof sourates[] = [];
  for (let i = 0; i < sourates.length; i += ITEMS_PER_ROW) {
    rows.push(sourates.slice(i, i + ITEMS_PER_ROW));
  }

  let characterIndex = 0;

  return (
    <div className="space-y-1 py-4">
      {rows.map((row, rowIndex) => {
        const isRightToLeft = rowIndex % 2 === 0;
        const orderedRow = isRightToLeft ? [...row] : [...row].reverse();
        const showCharacter = rowIndex < rows.length - 1;
        const charImg = CHARACTER_IMAGES[characterIndex % CHARACTER_IMAGES.length];
        const charOnRight = isRightToLeft;

        if (showCharacter) characterIndex++;

        return (
          <div key={rowIndex}>
            {/* Stars row with wave offsets */}
            <div
              className={cn(
                'flex items-start gap-0.5 px-1',
                isRightToLeft ? 'justify-end' : 'justify-start'
              )}
            >
              {orderedRow.map((sourate, itemIndex) => {
                const dbId = dbSourates.get(sourate.number);
                const progress = dbId ? sourateProgress.get(dbId) : undefined;
                const accessible = isSourateAccessible(sourate.number);
                const isValidated = !!progress?.is_validated;
                const { fill, stroke, strokeWidth } = getStarColors(sourate.number, isValidated);

                // Wave offset: alternate direction per row
                const waveDir = rowIndex % 2 === 0 ? 1 : -1;
                const offsetY = WAVE_OFFSETS[itemIndex] * waveDir;

                return (
                  <div
                    key={sourate.number}
                    style={{ transform: `translateY(${offsetY}px)` }}
                  >
                    <StarBadge
                      number={sourate.number}
                      isValidated={isValidated}
                      isAccessible={accessible}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      nameFrench={sourate.name_french}
                      onClick={() => onSourateClick(sourate)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Character at turn */}
            {showCharacter && (
              <div className={cn(
                'flex py-0.5',
                charOnRight ? 'justify-start pl-4' : 'justify-end pr-4'
              )}>
                <img
                  src={charImg.src}
                  alt={charImg.alt}
                  className="w-11 h-11 object-contain"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SouratePathView;
