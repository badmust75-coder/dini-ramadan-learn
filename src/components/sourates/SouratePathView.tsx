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
const ROW_SPACING = 90;
const CURVE_SPACING = 70;
const CONTAINER_WIDTH = 320;
const SIDE_PADDING = 55;

interface NodePos {
  x: number;
  y: number;
  sourate: SouratePathViewProps['sourates'][0];
  globalIndex: number;
}

const SouratePathView = ({
  sourates,
  dbSourates,
  sourateProgress,
  isSourateAccessible,
  onSourateClick,
}: SouratePathViewProps) => {
  const currentNodeRef = useRef<HTMLDivElement>(null);

  const { nodes, totalHeight, characterPlacements, milestonePlacements } = useMemo(() => {
    const rows: typeof sourates[] = [];
    for (let i = 0; i < sourates.length; i += ITEMS_PER_ROW) {
      rows.push(sourates.slice(i, i + ITEMS_PER_ROW));
    }

    const allNodes: NodePos[] = [];
    let y = 50;
    const usableWidth = CONTAINER_WIDTH - SIDE_PADDING * 2;

    rows.forEach((row, rowIndex) => {
      const isLTR = rowIndex % 2 === 0;
      row.forEach((sourate, itemIndex) => {
        const spacing = row.length > 1 ? usableWidth / (row.length - 1) : 0;
        const rawIdx = isLTR ? itemIndex : (row.length - 1 - itemIndex);
        const x = SIDE_PADDING + rawIdx * spacing;
        allNodes.push({
          x,
          y,
          sourate,
          globalIndex: rowIndex * ITEMS_PER_ROW + itemIndex,
        });
      });
      y += ROW_SPACING;
      if (rowIndex < rows.length - 1) {
        y += CURVE_SPACING;
      }
    });

    // Characters: every 10-12 sourates in the curve hollow
    const chars: Array<{ x: number; y: number; img: typeof CHARACTER_IMAGES[0] }> = [];
    let charIdx = 0;
    for (let rowIndex = 2; rowIndex < rows.length - 1; rowIndex += 4) {
      const isLTR = rowIndex % 2 === 0;
      // Last node of this row
      const lastInRow = allNodes.find(n => n.globalIndex === Math.min((rowIndex + 1) * ITEMS_PER_ROW - 1, allNodes.length - 1));
      const firstInNext = allNodes.find(n => n.globalIndex === (rowIndex + 1) * ITEMS_PER_ROW);
      if (lastInRow && firstInNext) {
        const charY = (lastInRow.y + firstInNext.y) / 2;
        // Place character on the "open" side of the curve
        const charX = isLTR ? 28 : CONTAINER_WIDTH - 28;
        chars.push({
          x: charX,
          y: charY,
          img: CHARACTER_IMAGES[charIdx % CHARACTER_IMAGES.length],
        });
        charIdx++;
      }
    }

    // Milestones: every 10 sourates, placed between rows at the curve
    const milestones: Array<{ x: number; y: number }> = [];
    for (let i = 9; i < allNodes.length; i += 10) {
      const node = allNodes[i];
      if (node) {
        const nextNode = allNodes[i + 1];
        if (nextNode) {
          milestones.push({
            x: CONTAINER_WIDTH / 2,
            y: (node.y + nextNode.y) / 2 + 10,
          });
        }
      }
    }

    return {
      nodes: allNodes,
      totalHeight: y + 40,
      characterPlacements: chars,
      milestonePlacements: milestones,
    };
  }, [sourates]);

  // Auto-scroll to current node
  useEffect(() => {
    const timer = setTimeout(() => {
      currentNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
    return () => clearTimeout(timer);
  }, [nodes]);

  // Find first current node
  const firstCurrentIndex = useMemo(() => {
    for (const node of nodes) {
      const dbId = dbSourates.get(node.sourate.number);
      const progress = dbId ? sourateProgress.get(dbId) : undefined;
      if (isSourateAccessible(node.sourate.number) && !progress?.is_validated) return node.globalIndex;
    }
    return -1;
  }, [nodes, dbSourates, sourateProgress, isSourateAccessible]);

  // SVG path
  const buildPath = (endIdx: number): string => {
    if (nodes.length === 0 || endIdx < 0) return '';
    const pts: string[] = [];
    pts.push(`M ${nodes[0].x} ${nodes[0].y}`);
    for (let i = 1; i <= endIdx && i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      if (Math.abs(curr.y - prev.y) < 20) {
        pts.push(`L ${curr.x} ${curr.y}`);
      } else {
        const midY = (prev.y + curr.y) / 2;
        pts.push(`C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`);
      }
    }
    return pts.join(' ');
  };

  const fullPath = buildPath(nodes.length - 1);

  // Completed path ends at last consecutive validated node
  const lastCompletedIdx = useMemo(() => {
    let last = -1;
    for (let i = 0; i < nodes.length; i++) {
      const dbId = dbSourates.get(nodes[i].sourate.number);
      const progress = dbId ? sourateProgress.get(dbId) : undefined;
      if (progress?.is_validated) last = i;
      else break;
    }
    return last;
  }, [nodes, dbSourates, sourateProgress]);

  const completedPath = buildPath(lastCompletedIdx);

  return (
    <div className="relative w-full overflow-x-hidden">
      <div
        className="relative mx-auto"
        style={{ width: CONTAINER_WIDTH, height: totalHeight }}
      >
        {/* SVG ribbon */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={CONTAINER_WIDTH}
          height={totalHeight}
        >
          {/* Background ribbon (locked) */}
          <path
            d={fullPath}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.4}
          />
          {/* Completed ribbon */}
          {completedPath && (
            <path
              d={completedPath}
              fill="none"
              stroke="hsl(142, 70%, 45%)"
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Milestone chests */}
        {milestonePlacements.map((ms, i) => (
          <div
            key={`ms-${i}`}
            className="absolute pointer-events-none flex flex-col items-center"
            style={{ left: ms.x - 32, top: ms.y - 32, width: 64 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg flex items-center justify-center border-2 border-amber-300">
              <Gift className="h-7 w-7 text-white drop-shadow" />
            </div>
            <span className="text-[8px] text-muted-foreground mt-0.5">Étape</span>
          </div>
        ))}

        {/* Characters */}
        {characterPlacements.map((char, i) => (
          <div
            key={`char-${i}`}
            className="absolute pointer-events-none"
            style={{ left: char.x - 24, top: char.y - 24, width: 48, height: 48 }}
          >
            <img
              src={char.img.src}
              alt={char.img.alt}
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
        ))}

        {/* Star nodes */}
        {nodes.map((node) => {
          const dbId = dbSourates.get(node.sourate.number);
          const progress = dbId ? sourateProgress.get(dbId) : undefined;
          const accessible = isSourateAccessible(node.sourate.number);
          const isValidated = !!progress?.is_validated;
          const isCurrent = node.globalIndex === firstCurrentIndex;
          const half = NODE_SIZE / 2;

          return (
            <div
              key={node.sourate.number}
              ref={isCurrent ? currentNodeRef : undefined}
              className="absolute flex flex-col items-center"
              style={{ left: node.x - half, top: node.y - half, width: NODE_SIZE }}
            >
              <StarNode
                number={node.sourate.number}
                isValidated={isValidated}
                isAccessible={accessible}
                isCurrent={isCurrent}
                onClick={() => onSourateClick(node.sourate)}
              />
              <span className="text-[7px] text-muted-foreground text-center leading-tight mt-0 w-16 truncate">
                {node.sourate.name_french}
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
      : 'hsl(220, 10%, 82%)';

  const starStroke = isValidated
    ? 'hsl(35, 80%, 50%)'
    : isAccessible
      ? 'hsl(35, 90%, 40%)'
      : 'hsl(220, 10%, 72%)';

  return (
    <button
      onClick={onClick}
      disabled={!isAccessible}
      className={cn(
        'relative flex items-center justify-center transition-all duration-200',
        isAccessible && !isValidated && 'hover:scale-110',
        !isAccessible && 'cursor-not-allowed opacity-70',
      )}
      style={{ width: NODE_SIZE, height: NODE_SIZE }}
    >
      {/* Pulsing glow for current node */}
      {isCurrent && (
        <div
          className="absolute rounded-full"
          style={{
            width: NODE_SIZE + 16,
            height: NODE_SIZE + 16,
            left: -8,
            top: -8,
            background: 'radial-gradient(circle, hsla(35, 80%, 55%, 0.3) 0%, transparent 70%)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
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
        'absolute inset-0 flex items-center justify-center font-bold leading-none pt-0.5',
        isValidated ? 'text-white' : isAccessible ? 'text-white text-xs' : 'text-foreground/50 text-[10px]'
      )}>
        {isValidated ? <Check className="h-5 w-5 text-white" strokeWidth={3} /> : number}
      </span>
      {!isAccessible && (
        <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-background shadow-md flex items-center justify-center border border-border">
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      )}
    </button>
  );
};

export default SouratePathView;
