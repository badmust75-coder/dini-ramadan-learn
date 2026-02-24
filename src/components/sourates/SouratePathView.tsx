import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Lock, Check, Gift } from 'lucide-react';
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
const NODE_SIZE = 56;
const NODE_GAP_Y = 24;
const ROW_GAP = 16;

type NodeType = 'sourate' | 'chest' | 'character';

interface PathNode {
  type: NodeType;
  sourate?: SouratePathViewProps['sourates'][0];
  characterIndex?: number;
  globalIndex: number;
}

const SouratePathView = ({
  sourates,
  dbSourates,
  sourateProgress,
  isSourateAccessible,
  onSourateClick,
}: SouratePathViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentNodeRef = useRef<HTMLDivElement>(null);

  // Build the node list: sourates with chest every 10 and character every 15
  const nodes = useMemo(() => {
    const result: PathNode[] = [];
    let charIdx = 0;
    sourates.forEach((s, i) => {
      // Insert chest milestone every 10 sourates (after 10th, 20th, etc.)
      if (i > 0 && i % 10 === 0) {
        result.push({ type: 'chest', globalIndex: result.length });
      }
      // Insert character every 15 sourates
      if (i > 0 && i % 15 === 0) {
        result.push({ type: 'character', characterIndex: charIdx++ % CHARACTER_IMAGES.length, globalIndex: result.length });
      }
      result.push({ type: 'sourate', sourate: s, globalIndex: result.length });
    });
    return result;
  }, [sourates]);

  // Build rows of ITEMS_PER_ROW
  const rows: PathNode[][] = [];
  for (let i = 0; i < nodes.length; i += ITEMS_PER_ROW) {
    rows.push(nodes.slice(i, i + ITEMS_PER_ROW));
  }

  // Find first available (not completed, not locked) sourate for auto-scroll
  const firstAvailableNumber = useMemo(() => {
    for (const s of sourates) {
      const dbId = dbSourates.get(s.number);
      const progress = dbId ? sourateProgress.get(dbId) : undefined;
      const accessible = isSourateAccessible(s.number);
      if (accessible && !progress?.is_validated) return s.number;
    }
    return null;
  }, [sourates, dbSourates, sourateProgress, isSourateAccessible]);

  useEffect(() => {
    if (currentNodeRef.current) {
      setTimeout(() => {
        currentNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [firstAvailableNumber]);

  const getNodeState = (sourate: SouratePathViewProps['sourates'][0]) => {
    const dbId = dbSourates.get(sourate.number);
    const progress = dbId ? sourateProgress.get(dbId) : undefined;
    const accessible = isSourateAccessible(sourate.number);
    if (progress?.is_validated) return 'completed';
    if (accessible) return 'available';
    return 'locked';
  };

  // Compute x positions for zigzag
  const containerPadding = 24;

  return (
    <div ref={scrollRef} className="relative w-full pb-8">
      {rows.map((row, rowIndex) => {
        const isLeftToRight = rowIndex % 2 === 0;
        const orderedRow = isLeftToRight ? row : [...row].reverse();

        return (
          <div key={rowIndex} className="relative">
            {/* Connecting lines between nodes in the row */}
            <div
              className={cn(
                'flex items-start px-2',
                isLeftToRight ? 'justify-start' : 'justify-end'
              )}
              style={{ gap: '2px' }}
            >
              {orderedRow.map((node, colIndex) => {
                const isFirst = colIndex === 0;
                const isLast = colIndex === orderedRow.length - 1;

                if (node.type === 'chest') {
                  return (
                    <div
                      key={`chest-${node.globalIndex}`}
                      className="flex flex-col items-center"
                      style={{ width: NODE_SIZE + 8, marginBottom: ROW_GAP }}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--secondary))] to-[hsl(var(--gold-dark))] flex items-center justify-center shadow-lg border-2 border-[hsl(var(--gold-light))]">
                        <Gift className="w-7 h-7 text-[hsl(var(--primary-foreground))]" />
                      </div>
                      <span className="text-[9px] text-[hsl(var(--secondary))] font-bold mt-1">Étape</span>
                    </div>
                  );
                }

                if (node.type === 'character') {
                  const charImg = CHARACTER_IMAGES[node.characterIndex || 0];
                  return (
                    <div
                      key={`char-${node.globalIndex}`}
                      className="flex flex-col items-center"
                      style={{ width: NODE_SIZE + 8, marginBottom: ROW_GAP }}
                    >
                      <img
                        src={charImg.src}
                        alt={charImg.alt}
                        className="w-14 h-14 object-contain drop-shadow-md"
                      />
                    </div>
                  );
                }

                // Sourate node
                const sourate = node.sourate!;
                const state = getNodeState(sourate);
                const isCurrent = sourate.number === firstAvailableNumber;

                return (
                  <div
                    key={sourate.number}
                    ref={isCurrent ? currentNodeRef : undefined}
                    className="flex flex-col items-center"
                    style={{ width: NODE_SIZE + 8, marginBottom: ROW_GAP }}
                  >
                    <button
                      onClick={() => onSourateClick(sourate)}
                      disabled={state === 'locked'}
                      className={cn(
                        'relative rounded-full flex items-center justify-center transition-all duration-300 border-[3px]',
                        state === 'completed' && 'bg-gradient-to-br from-[hsl(142,70%,45%)] to-[hsl(142,60%,35%)] border-[hsl(var(--secondary))] shadow-lg',
                        state === 'available' && 'bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--royal-blue-dark))] border-[hsl(var(--secondary))] shadow-lg',
                        state === 'locked' && 'bg-muted border-border cursor-not-allowed opacity-60',
                        isCurrent && 'ring-4 ring-[hsl(var(--secondary))]/40 animate-pulse-gold'
                      )}
                      style={{ width: NODE_SIZE, height: NODE_SIZE }}
                    >
                      {state === 'completed' ? (
                        <Check className="w-6 h-6 text-white" strokeWidth={3} />
                      ) : state === 'locked' ? (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <span className="text-sm font-bold text-[hsl(var(--primary-foreground))]">{sourate.number}</span>
                      )}

                      {/* Number badge for completed */}
                      {state === 'completed' && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] text-[8px] font-bold flex items-center justify-center shadow">
                          {sourate.number}
                        </span>
                      )}
                    </button>

                    {/* Sourate name */}
                    <span className={cn(
                      'text-[8px] text-center leading-tight mt-1 w-full truncate px-0.5',
                      state === 'locked' ? 'text-muted-foreground/60' : 'text-muted-foreground'
                    )}>
                      {sourate.name_french.split('(')[0].trim()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Vertical connector line to next row */}
            {rowIndex < rows.length - 1 && (
              <div
                className={cn('flex', isLeftToRight ? 'justify-end pr-6' : 'justify-start pl-6')}
                style={{ marginTop: -ROW_GAP + 4, marginBottom: 4 }}
              >
                <div className="w-1 h-6 rounded-full bg-border" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SouratePathView;
