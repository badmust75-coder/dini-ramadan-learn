import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, SkipForward, RotateCcw, Pause, Play, Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfetti } from '@/hooks/useConfetti';

interface Quiz {
  id: string;
  day_id: number;
  question: string;
  options: string[];
  correct_option: number | null;
  correct_options?: number[];
  explanation?: string | null;
  question_order?: number;
}

interface DayVideo {
  id: string;
  video_url: string;
  file_name: string | null;
  display_order: number;
}

interface RamadanDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayNumber: number;
  theme: string | null;
  videoUrl: string | null;
  videos: DayVideo[];
  quizzes: Quiz[];
  quizCompleted: boolean;
  videoWatched: boolean;
  maxErrors?: number;
  onMarkVideoWatched: () => void;
  onSubmitQuiz: (allCorrect: boolean, wrongCount: number) => void;
  onSaveQuizResponse: (quizId: string, selectedOption: number, attemptNumber: number, isCorrect: boolean) => void;
}

type Step = 'video' | 'quiz' | 'perfect' | 'failed';

const RamadanDayDialog = ({
  open,
  onOpenChange,
  dayNumber,
  theme,
  videoUrl,
  videos,
  quizzes,
  quizCompleted,
  videoWatched,
  maxErrors = 3,
  onMarkVideoWatched,
  onSubmitQuiz,
  onSaveQuizResponse,
}: RamadanDayDialogProps) => {
  const [step, setStep] = useState<Step>('video');
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [attemptCount, setAttemptCount] = useState(0); // 0 = not attempted, 1 = first attempt done, 2 = second attempt done
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong-first' | 'wrong-final' | 'correct-second' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [allFirstAttempt, setAllFirstAttempt] = useState(true); // Track perfect score
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const quizRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { fireConfetti, fireSuccess } = useConfetti();

  // Sort quizzes by question_order
  const sortedQuizzes = [...quizzes].sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0));

  const playlist: DayVideo[] = videos.length > 0
    ? videos
    : videoUrl
    ? [{ id: 'legacy', video_url: videoUrl, file_name: null, display_order: 0 }]
    : [];

  const currentVideo = playlist[currentVideoIdx] ?? null;
  const totalVideos = playlist.length;
  const totalQuestions = sortedQuizzes.length;
  const currentQuiz = sortedQuizzes[currentQuestionIdx];

  const resetState = () => {
    setStep('video');
    setCurrentVideoIdx(0);
    setCurrentQuestionIdx(0);
    setSelectedAnswers([]);
    setAttemptCount(0);
    setAnswerResult(null);
    setShowExplanation(false);
    setCorrectCount(0);
    setWrongCount(0);
    setAnsweredCount(0);
    setAllFirstAttempt(true);
    setIsPlaying(false);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  // ── Sound effects (Web Audio API, no external files) ──────────────────
  const playDing = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.65);
      osc.onended = () => ctx.close();
    } catch (_) { /* silently ignore if audio not supported */ }
  };

  const playBoing = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
      osc.onended = () => ctx.close();
    } catch (_) { /* silently ignore */ }
  };
  // ────────────────────────────────────────────────────────────────────────

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  };

  const handleVideoEnded = () => {
    if (!videoWatched) onMarkVideoWatched();
    if (currentVideoIdx < totalVideos - 1) {
      setCurrentVideoIdx(prev => prev + 1);
    } else {
      goToQuiz();
    }
  };

  useEffect(() => {
    if (step === 'video' && videoRef.current && currentVideoIdx > 0) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [currentVideoIdx, step]);

  const goToQuiz = () => {
    setStep('quiz');
    setTimeout(() => {
      quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSkipToQuiz = () => {
    if (!videoWatched) onMarkVideoWatched();
    goToQuiz();
  };

  const handleSkipToNextVideo = () => {
    if (!videoWatched) onMarkVideoWatched();
    if (currentVideoIdx < totalVideos - 1) {
      setCurrentVideoIdx(prev => prev + 1);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
  };

  const handleVideoPlay = () => setIsPlaying(true);
  const handleVideoPause = () => setIsPlaying(false);

  const advanceToNextQuestion = () => {
    const newAnswered = answeredCount + 1;
    setAnsweredCount(newAnswered);

    if (newAnswered >= totalQuestions) {
      // Quiz finished
      const allCorrect = wrongCount === 0;
      const newWrongCount = wrongCount; // capture current value

      if (newWrongCount >= maxErrors) {
        // Échec : trop d'erreurs, bloque la validation
        setStep('failed');
        onSubmitQuiz(false, newWrongCount); // ne valide pas
      } else if (allCorrect && allFirstAttempt) {
        // Perfect score!
        setStep('perfect');
        fireConfetti();
        setTimeout(() => fireConfetti(), 500);
        onSubmitQuiz(true, 0);
      } else {
        // Réussi (< maxErrors erreurs mais pas parfait)
        onSubmitQuiz(allCorrect, newWrongCount);
      }
    } else {
      // Move to next question
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedAnswers([]);
      setAttemptCount(0);
      setAnswerResult(null);
      setShowExplanation(false);
    }
  };

  const getCorrectOptionsForQuiz = (quiz: Quiz): number[] => {
    if (quiz.correct_options && quiz.correct_options.length > 0) return quiz.correct_options;
    if (quiz.correct_option !== null && quiz.correct_option !== undefined) return [quiz.correct_option];
    return [];
  };

  const isMultipleChoice = (quiz: Quiz): boolean => {
    return getCorrectOptionsForQuiz(quiz).length > 1;
  };

  const handleToggleAnswer = (optIdx: number) => {
    if (showExplanation || answerResult === 'wrong-first') return;
    setSelectedAnswers(prev => 
      prev.includes(optIdx) ? prev.filter(i => i !== optIdx) : [...prev, optIdx]
    );
  };

  const handleValidateAnswer = () => {
    if (selectedAnswers.length === 0 || !currentQuiz) return;

    const correctOpts = getCorrectOptionsForQuiz(currentQuiz);
    const isCorrect = correctOpts.length === selectedAnswers.length && 
      correctOpts.every(o => selectedAnswers.includes(o));
    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);

    // Save the first selected option for the response record (legacy compat)
    const primarySelected = selectedAnswers[0];

    if (isCorrect) {
      playDing();
      if (currentAttempt === 1) {
        setAnswerResult('correct');
        setCorrectCount(prev => prev + 1);
      } else {
        setAnswerResult('correct-second');
        setCorrectCount(prev => prev + 1);
        setAllFirstAttempt(false);
      }
      onSaveQuizResponse(currentQuiz.id, primarySelected, currentAttempt, true);
      setShowExplanation(true);
      autoAdvanceTimerRef.current = setTimeout(() => advanceToNextQuestion(), 4000);
    } else {
      playBoing();
      if (currentAttempt === 1) {
        setAnswerResult('wrong-first');
        onSaveQuizResponse(currentQuiz.id, primarySelected, 1, false);
        setTimeout(() => {
          setSelectedAnswers([]);
          setAnswerResult(null);
        }, 1500);
      } else {
        setAnswerResult('wrong-final');
        setWrongCount(prev => prev + 1);
        setAllFirstAttempt(false);
        onSaveQuizResponse(currentQuiz.id, primarySelected, 2, false);
        setShowExplanation(true);
        autoAdvanceTimerRef.current = setTimeout(() => advanceToNextQuestion(), 4000);
      }
    }
  };

  const handleContinue = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    advanceToNextQuestion();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        {/* Header with big close button */}
        <div className="p-4 bg-gradient-to-r from-primary to-royal-dark text-primary-foreground rounded-t-lg relative">
          <button
            onClick={() => handleOpenChange(false)}
            className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white text-xl font-bold shadow-lg transition-all hover:scale-110"
            aria-label="Fermer"
          >
            ✕
          </button>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-primary-foreground pr-12">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="font-bold">{dayNumber}</span>
              </div>
              <div>
                <div className="font-bold">Jour {dayNumber}</div>
                {theme && <p className="text-sm opacity-80 font-normal">{theme}</p>}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4">
          {/* Failed screen (≥3 errors) */}
          {step === 'failed' ? (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
                <RotateCcw className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Oups ! 😕
              </h3>
              <p className="text-sm font-medium text-destructive">
                Tu as fait {wrongCount} erreur{wrongCount > 1 ? 's' : ''} — le seuil est de {maxErrors} erreur{maxErrors > 1 ? 's' : ''} maximum.
              </p>
              <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-left space-y-2">
                <p className="text-sm text-orange-700 dark:text-orange-300 text-center">
                  Oups ! Tu as fait un peu trop d'erreurs. Revois bien la vidéo et refais le quiz pour valider ta journée !
                </p>
              </div>
              <Button
                onClick={() => {
                  resetState();
                  setStep('video');
                }}
                className="w-full bg-gradient-to-r from-primary to-royal-dark"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Revoir la vidéo et recommencer
              </Button>
            </div>
          ) : step === 'perfect' ? (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="relative inline-block">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gold to-yellow-400 flex items-center justify-center animate-scale-in">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
                <Star className="absolute -top-2 -right-2 h-8 w-8 text-gold fill-gold animate-scale-in" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Allahouma barik ! 🌟🏆
              </h3>
              <p className="text-lg font-semibold text-gold">
                Quel talent ! Sans-Faute parfait !
              </p>
              <p className="text-sm text-muted-foreground">
                Toutes les réponses correctes dès le premier coup !
              </p>
              <div className="flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-gold fill-gold" />
                ))}
              </div>
            </div>
          ) : quizCompleted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h4 className="font-semibold text-foreground">Quiz complété !</h4>
              <p className="text-sm text-muted-foreground">
                Vous avez déjà validé ce jour. Bravo !
              </p>
              {playlist.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">Revoir les vidéos :</p>
                  {playlist.map((v, idx) => (
                    <div key={v.id} className="space-y-1">
                      {playlist.length > 1 && (
                        <p className="text-xs text-muted-foreground text-left">Vidéo {idx + 1}</p>
                      )}
                      <div className="aspect-video rounded-xl overflow-hidden bg-black">
                        <video src={v.video_url} controls className="w-full h-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sortedQuizzes.length > 0 && (
                <Button
                  onClick={() => {
                    resetState();
                    setStep('quiz');
                  }}
                  variant="outline"
                  className="mt-3"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refaire le quiz (entraînement)
                </Button>
              )}
            </div>
          ) : step === 'video' ? (
            /* Video step — Playlist */
            <div className="space-y-4">
              {playlist.length > 0 && currentVideo ? (
                <>
                  {totalVideos > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Vidéo {currentVideoIdx + 1} / {totalVideos}</span>
                      <div className="flex gap-1">
                        {playlist.map((_, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'w-2 h-2 rounded-full transition-colors',
                              idx < currentVideoIdx ? 'bg-green-500' :
                              idx === currentVideoIdx ? 'bg-gold' : 'bg-muted'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="aspect-video rounded-xl overflow-hidden bg-black relative group">
                    <video
                      ref={videoRef}
                      key={currentVideo.id}
                      src={currentVideo.video_url}
                      className="w-full h-full"
                      autoPlay={currentVideoIdx === 0}
                      onEnded={handleVideoEnded}
                      onPlay={handleVideoPlay}
                      onPause={handleVideoPause}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => handleSeek(-10)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20" onClick={handlePlayPause}>
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => handleSeek(10)}>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <span className="text-white text-xs ml-1">
                        {currentVideoIdx < totalVideos - 1 ? `Vidéo ${currentVideoIdx + 1}/${totalVideos}` : 'Dernière vidéo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {currentVideoIdx < totalVideos - 1 && (
                      <Button onClick={handleSkipToNextVideo} variant="outline" className="flex-1">
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Vidéo suivante
                      </Button>
                    )}
                    <Button onClick={handleSkipToQuiz} variant="outline" className="flex-1">
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Passer au quiz
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Pas de vidéo pour ce jour</p>
                  <Button onClick={() => setStep('quiz')} className="mt-4">
                    Passer au quiz
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Quiz step — one question at a time with second chance */
            <div ref={quizRef} className="space-y-4">
              {currentQuiz && (
                <>
                  {/* Benevolent error counter banner */}
                  {(() => {
                    const remaining = maxErrors - wrongCount - 1;
                    let icon = '🌟';
                    let msg = 'Allahouma barik ! Continue comme ça !';
                    let bgClass = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                    let textClass = 'text-green-700 dark:text-green-300';
                    let iconColor = 'text-green-500';

                    if (wrongCount === maxErrors - 2) {
                      // 1 error before limit (e.g. 1 error if max=3)
                      icon = '💪';
                      msg = "C'est pas grave, reste concentré !";
                      bgClass = 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
                      textClass = 'text-amber-700 dark:text-amber-300';
                      iconColor = 'text-amber-500';
                    } else if (wrongCount === maxErrors - 1) {
                      // 1 chance left before failure
                      icon = '✨';
                      msg = `Attention, encore 1 chance ! Tu peux le faire !`;
                      bgClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                      textClass = 'text-red-700 dark:text-red-300';
                      iconColor = 'text-red-500';
                    } else if (wrongCount === 0) {
                      icon = '🌟';
                      msg = 'Allahouma barik ! Continue comme ça !';
                    }

                    return (
                      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border animate-fade-in', bgClass)}>
                        <span className={cn('text-xl', iconColor)}>{icon}</span>
                        <div className="flex-1">
                          <p className={cn('text-xs font-semibold', textClass)}>{msg}</p>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: maxErrors }).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                'w-3 h-3 rounded-full transition-all duration-300',
                                i < wrongCount ? 'bg-red-400 scale-110' : 'bg-muted'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Progress indicator */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Question {currentQuestionIdx + 1}/{totalQuestions}</span>
                    <div className="flex gap-1">
                      {sortedQuizzes.map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'w-2 h-2 rounded-full transition-colors',
                            idx < currentQuestionIdx ? 'bg-green-500' :
                            idx === currentQuestionIdx ? 'bg-gold' : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border space-y-3">
                    <h4 className="font-semibold text-foreground text-sm">
                      {currentQuiz.question}
                    </h4>

                    {/* "Oups" message for first wrong attempt */}
                    {answerResult === 'wrong-first' && (
                      <div className="text-center py-2 px-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 animate-fade-in">
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          Oups, essaie encore ! 😊
                        </p>
                        <p className="text-xs text-orange-500 dark:text-orange-300 mt-1">
                          Deuxième et dernière tentative...
                        </p>
                      </div>
                    )}

                    {isMultipleChoice(currentQuiz) && !showExplanation && answerResult !== 'wrong-first' && (
                      <p className="text-xs text-muted-foreground italic mb-1">Plusieurs réponses possibles</p>
                    )}
                    <div className="space-y-2">
                      {currentQuiz.options.map((option, optIdx) => {
                        const correctOpts = getCorrectOptionsForQuiz(currentQuiz);
                        const isCorrectOption = correctOpts.includes(optIdx);
                        const isSelected = selectedAnswers.includes(optIdx);
                        const showCorrect = showExplanation && isCorrectOption;
                        const showWrong = showExplanation && isSelected && !isCorrectOption;
                        const showWrongFinal = answerResult === 'wrong-final' && isSelected && !isCorrectOption;

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleToggleAnswer(optIdx)}
                            className={cn(
                              'flex items-center space-x-3 p-2.5 rounded-lg border transition-colors cursor-pointer',
                              showCorrect && 'border-green-500 bg-green-50 dark:bg-green-900/20',
                              (showWrong || showWrongFinal) && 'border-destructive bg-destructive/10',
                              !showExplanation && answerResult !== 'wrong-first' && 'hover:bg-muted/50',
                              !showExplanation && !answerResult && isSelected && 'border-primary bg-primary/5'
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={showExplanation || answerResult === 'wrong-first'}
                              className="pointer-events-none"
                            />
                            <Label
                              className={cn(
                                'flex-1 cursor-pointer text-sm',
                                showCorrect && 'text-green-700 dark:text-green-400 font-medium',
                                (showWrong || showWrongFinal) && 'text-destructive'
                              )}
                            >
                              {option}
                              {showCorrect && ' ✓'}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation block */}
                  {showExplanation && (
                    <div className="animate-fade-in space-y-3">
                      {/* Result message */}
                      {(answerResult === 'correct' || answerResult === 'correct-second') && (
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            {answerResult === 'correct' ? '✅ Bonne réponse du premier coup !' : '✅ Bonne réponse à la deuxième tentative !'}
                          </p>
                        </div>
                      )}
                      {answerResult === 'wrong-final' && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                          <p className="text-sm font-medium text-destructive">
                            ❌ Réponse incorrecte. La bonne réponse est indiquée en vert.
                          </p>
                        </div>
                      )}

                      {/* Explanation text */}
                      {currentQuiz.explanation && (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">📖 Explication :</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{currentQuiz.explanation}</p>
                        </div>
                      )}

                      {/* Continue button */}
                      <Button
                        onClick={handleContinue}
                        className="w-full bg-gradient-to-r from-primary to-royal-dark"
                      >
                        <ChevronRight className="h-4 w-4 mr-2" />
                        {currentQuestionIdx < totalQuestions - 1 ? 'Question suivante' : 'Terminer le quiz'}
                      </Button>
                    </div>
                  )}

                  {/* Validate button (only when no explanation shown and not in wrong-first state) */}
                  {!showExplanation && answerResult !== 'wrong-first' && (
                    <Button
                      onClick={handleValidateAnswer}
                      disabled={selectedAnswers.length === 0}
                      className="w-full bg-gradient-to-r from-primary to-royal-dark"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Valider{attemptCount === 1 ? ' (2ème tentative)' : ''}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RamadanDayDialog;
