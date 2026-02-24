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

const ITEMS_PER_ROW = 3;
const NODE_SIZE = 64;
const MILESTONE_SIZE = 80;
const ROW_HEIGHT = 100;
const CURVE_HEIGHT = 60;
const CONTAINER_WIDTH = 340;
const SIDE_PADDING = 50;

// Calculate X positions for nodes in a row
const getNodeX = (indexInRow: number, rowLength: number, isLeftToRight: boolean): number => {
  const usableWidth = CONTAINER_WIDTH - SIDE_PADDING * 2;
  const spacing = rowLength > 1 ? usableWidth / (rowLength - 1) : 0;
  const rawIndex = isLeftToRight ? indexInRow : (rowLength - 1 - indexInRow);
  return SIDE_PADDING + rawIndex * spacing;
};

interface NodePosition {
  x: number;
  y: number;
  sourate: SouratePathViewProps['sourates'][0];
  isMilestone: boolean;
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

  // Build rows of 3 and compute positions
  const { nodes, totalHeight, characterPlacements } = useMemo(() => {
    const rows: typeof sourates[] = [];
    for (let i = 0; i < sourates.length; i += ITEMS_PER_ROW) {
      rows.push(sourates.slice(i, i + ITEMS_PER_ROW));
    }

    const allNodes: NodePosition[] = [];
    let y = 40; // top padding

    rows.forEach((row, rowIndex) => {
      const isLeftToRight = rowIndex % 2 === 0;
      row.forEach((sourate, itemIndex) => {
        const globalIndex = rowIndex * ITEMS_PER_ROW + itemIndex;
        const isMilestone = (globalIndex + 1) % 10 === 0;
        allNodes.push({
          x: getNodeX(itemIndex, row.length, isLeftToRight),
          y: y,
          sourate,
          isMilestone,
          globalIndex,
        });
      });
      y += ROW_HEIGHT;
      if (rowIndex < rows.length - 1) {
        y += CURVE_HEIGHT;
      }
    });

    // Characters: place one every ~10 nodes, in the curve hollow
    const chars: Array<{ x: number; y: number; img: typeof CHARACTER_IMAGES[0]; side: 'left' | 'right' }> = [];
    let charIdx = 0;
    for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex++) {
      // Place character in curve area between rows
      const nodesBefore = (rowIndex + 1) * ITEMS_PER_ROW;
      if (nodesBefore % 10 === 0 || (nodesBefore > 0 && nodesBefore % 12 === 0)) {
        const isLeftToRight = rowIndex % 2 === 0;
        // character goes on the opposite side of where the curve ends
        const side: 'left' | 'right' = isLeftToRight ? 'right' : 'left';
        // Find the Y between these rows
        const lastNodeInRow = allNodes.find(n => n.globalIndex === (rowIndex + 1) * ITEMS_PER_ROW - 1);
        const firstNodeNextRow = allNodes.find(n => n.globalIndex === (rowIndex + 1) * ITEMS_PER_ROW);
        if (lastNodeInRow && firstNodeNextRow) {
          const charY = (lastNodeInRow.y + firstNodeNextRow.y) / 2;
          chars.push({
            x: side === 'right' ? CONTAINER_WIDTH - 35 : 35,
            y: charY,
            img: CHARACTER_IMAGES[charIdx % CHARACTER_IMAGES.length],
            side,
          });
          charIdx++;
        }
      }
    }

    return {
      nodes: allNodes,
      totalHeight: y + 60,
      characterPlacements: chars,
    };
  }, [sourates]);

  // Find first accessible non-validated sourate for auto-scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      currentNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(timer);
  }, [nodes]);

  // Find first current (accessible + not validated) for ref assignment
  const firstCurrentIndex = useMemo(() => {
    for (const node of nodes) {
      const dbId = dbSourates.get(node.sourate.number);
      const progress = dbId ? sourateProgress.get(dbId) : undefined;
      const accessible = isSourateAccessible(node.sourate.number);
      if (accessible && !progress?.is_validated) return node.globalIndex;
    }
    return -1;
  }, [nodes, dbSourates, sourateProgress, isSourateAccessible]);

  // Build SVG path connecting all nodes
  const pathD = useMemo(() => {
    if (nodes.length === 0) return '';
    const parts: string[] = [];
    parts.push(`M ${nodes[0].x} ${nodes[0].y}`);
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      // If same row (close y), straight line
      if (Math.abs(curr.y - prev.y) < 20) {
        parts.push(`L ${curr.x} ${curr.y}`);
      } else {
        // Curve between rows
        const midY = (prev.y + curr.y) / 2;
        parts.push(`C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`);
      }
    }
    return parts.join(' ');
  }, [nodes]);

  // Find where completed path ends
  const completedPathD = useMemo(() => {
    if (nodes.length === 0) return '';
    let lastCompletedIdx = -1;
    for (let i = 0; i < nodes.length; i++) {
      const dbId = dbSourates.get(nodes[i].sourate.number);
      const progress = dbId ? sourateProgress.get(dbId) : undefined;
      if (progress?.is_validated) lastCompletedIdx = i;
      else break;
    }
    if (lastCompletedIdx < 0) return '';

    const parts: string[] = [];
    parts.push(`M ${nodes[0].x} ${nodes[0].y}`);
    for (let i = 1; i <= lastCompletedIdx; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      if (Math.abs(curr.y - prev.y) < 20) {
        parts.push(`L ${curr.x} ${curr.y}`);
      } else {
        const midY = (prev.y + curr.y) / 2;
        parts.push(`C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`);
      }
    }
    return parts.join(' ');
  }, [nodes, dbSourates, sourateProgress]);

  return (
    <div ref={scrollRef} className="relative w-full overflow-x-hidden">
      <div
        className="relative mx-auto"
        style={{ width: CONTAINER_WIDTH, height: totalHeight }}
      >
        {/* SVG ribbon */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={CONTAINER_WIDTH}
          height={totalHeight}
          viewBox={`0 0 ${CONTAINER_WIDTH} ${totalHeight}`}
        >
          {/* Background path (locked) */}
          <path
            d={pathD}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.5}
          />
          {/* Completed path (gold/green) */}
          {completedPathD && (
            <path
              d={completedPathD}
              fill="none"
              stroke="hsl(142, 70%, 45%)"
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Character mascots */}
        {characterPlacements.map((char, i) => (
          <div
            key={`char-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: char.x - 28,
              top: char.y - 28,
              width: 56,
              height: 56,
            }}
          >
            <img
              src={char.img.src}
              alt={char.img.alt}
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
        ))}

        {/* Nodes */}
        {nodes.map((node) => {
          const dbId = dbSourates.get(node.sourate.number);
          const progress = dbId ? sourateProgress.get(dbId) : undefined;
          const accessible = isSourateAccessible(node.sourate.number);
          const isValidated = !!progress?.is_validated;
          const isCurrent = node.globalIndex === firstCurrentIndex;
          const size = node.isMilestone ? MILESTONE_SIZE : NODE_SIZE;

          return (
            <div
              key={node.sourate.number}
              ref={isCurrent ? currentNodeRef : undefined}
              className="absolute flex flex-col items-center"
              style={{
                left: node.x - size / 2,
                top: node.y - size / 2,
                width: size,
              }}
            >
              {node.isMilestone ? (
                <MilestoneNode />
              ) : (
                <StarNode
                  number={node.sourate.number}
                  isValidated={isValidated}
                  isAccessible={accessible}
                  isCurrent={isCurrent}
                  onClick={() => onSourateClick(node.sourate)}
                />
              )}
              <span className="text-[8px] text-muted-foreground text-center leading-tight mt-0.5 w-16 truncate">
                {node.isMilestone ? 'Étape' : node.sourate.name_french}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Star Node ──
const StarNode = ({
  number,
  isValidated,
  isAccessible,
  isCurrent,
  onClick,
}: {
  number: number;
  isValidated: boolean;
  isAccessible: boolean;
  isCurrent: boolean;
  onClick: () => void;
}) => {
  const starFill = isValidated
    ? 'hsl(142, 70%, 45%)'
    : isAccessible
      ? 'hsl(35, 80%, 55%)'
      : 'hsl(var(--muted))';

  const starStroke = isValidated
    ? 'hsl(35, 80%, 50%)'
    : isAccessible
      ? 'hsl(35, 90%, 45%)'
      : 'hsl(var(--muted-foreground) / 0.3)';

  return (
    <button
      onClick={onClick}
      disabled={!isAccessible}
      className={cn(
        'relative w-16 h-16 flex items-center justify-center transition-all duration-200',
        isAccessible && !isValidated && 'hover:scale-110',
        !isAccessible && 'cursor-not-allowed',
        isCurrent && 'animate-pulse'
      )}
    >
      {/* Glow ring for current */}
      {isCurrent && (
        <div className="absolute inset-0 rounded-full bg-gold/20 animate-ping" style={{ animationDuration: '2s' }} />
      )}
      <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-lg">
        <path
          d="M24 2 L29.5 17.5 L46 17.5 L33 27.5 L37.5 44 L24 34 L10.5 44 L15 27.5 L2 17.5 L18.5 17.5 Z"
          fill={starFill}
          stroke={starStroke}
          strokeWidth={isValidated ? 3 : 2}
        />
      </svg>
      <span className={cn(
        'absolute inset-0 flex items-center justify-center font-bold text-xs leading-none pt-0.5',
        isValidated ? 'text-white' : isAccessible ? 'text-white' : 'text-muted-foreground/60'
      )}>
        {isValidated ? <Check className="h-5 w-5 text-white" /> : number}
      </span>
      {!isAccessible && (
        <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-background shadow-md flex items-center justify-center border border-border">
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      )}
    </button>
  );
};

// ── Milestone (chest/gift) Node ──
const MilestoneNode = () => (
  <div className="w-20 h-20 flex items-center justify-center">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg flex items-center justify-center border-2 border-amber-300">
      <Gift className="h-8 w-8 text-white drop-shadow" />
    </div>
  </div>
);

export default SouratePathView;
