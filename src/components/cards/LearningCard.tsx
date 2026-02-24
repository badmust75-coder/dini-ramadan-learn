import { useState, useEffect } from 'react';
import { Check, BookOpen, Brain, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import AudioPlayer from '@/components/audio/AudioPlayer';

interface LearningCardProps {
  id: number;
  titleArabic: string;
  titleFrench: string;
  subtitle?: string;
  audioUrl?: string;
  isValidated: boolean;
  isMemorized: boolean;
  onValidate: (id: number, validated: boolean) => void;
  onMemorize: (id: number) => void;
  progressPercentage?: number;
  averageProgress?: number;
  showAverageProgress?: boolean;
  onReplaceAudio?: (file: File) => void;
  onDeleteAudio?: () => void;
  canManageAudio?: boolean;
}

const LearningCard = ({
  id,
  titleArabic,
  titleFrench,
  subtitle,
  audioUrl,
  isValidated,
  isMemorized,
  onValidate,
  onMemorize,
  progressPercentage = 0,
  averageProgress = 0,
  showAverageProgress = false,
}: LearningCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'module-card rounded-2xl overflow-hidden transition-all duration-300',
        isValidated && 'border-green-500/30 bg-green-50/30',
        isExpanded && 'shadow-elevated'
      )}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4"
      >
        {/* Number badge */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
          isValidated 
            ? 'bg-green-500 text-white' 
            : 'bg-gradient-to-br from-primary to-royal-dark text-primary-foreground'
        )}>
          {isValidated ? <Check className="h-5 w-5" /> : id}
        </div>

        {/* Title */}
        <div className="flex-1 text-left min-w-0">
          <p className="font-arabic text-lg text-foreground truncate">
            {titleArabic}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {titleFrench}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70">{subtitle}</p>
          )}
        </div>

        {/* Validation checkbox */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2"
        >
          <Checkbox
            checked={isValidated}
            onCheckedChange={(checked) => onValidate(id, checked as boolean)}
            className={cn(
              'h-6 w-6 rounded-lg border-2',
              isValidated 
                ? 'border-green-500 bg-green-500 data-[state=checked]:bg-green-500' 
                : 'border-gold'
            )}
          />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          {/* Audio Player */}
          <AudioPlayer
            audioUrl={audioUrl}
            titleArabic={titleArabic}
            title={titleFrench}
          />

          {/* Progress bars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ma progression</span>
              <span className="font-medium text-primary">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />

            {showAverageProgress && (
              <>
                <div className="flex items-center justify-between text-sm mt-3">
                  <span className="text-muted-foreground text-xs">Moyenne des élèves</span>
                  <span className="text-xs text-muted-foreground">{averageProgress}%</span>
                </div>
                <Progress value={averageProgress} className="h-1 opacity-50" />
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => onMemorize(id)}
              className={cn(
                'flex-1 gap-2',
                isMemorized 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'btn-memorize'
              )}
            >
              <Brain className="h-4 w-4" />
              {isMemorized ? 'Mémorisé !' : 'Mémoriser'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Memorization techniques hint */}
          <div className="bg-muted/50 rounded-xl p-3 text-sm">
            <p className="font-medium text-foreground flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-gold" />
              Techniques de mémorisation
            </p>
            <ul className="text-muted-foreground text-xs space-y-1 ml-6">
              <li>• Écouter plusieurs fois</li>
              <li>• Répéter à voix haute</li>
              <li>• Réviser régulièrement</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningCard;
