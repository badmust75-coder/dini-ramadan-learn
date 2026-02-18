import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, SkipForward, RotateCcw, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Quiz {
  id: string;
  day_id: number;
  question: string;
  options: string[];
  correct_option: number | null;
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
  videoUrl: string | null; // legacy single video
  videos: DayVideo[];     // new multi-video list
  quizzes: Quiz[];
  quizCompleted: boolean;
  videoWatched: boolean;
  onMarkVideoWatched: () => void;
  onSubmitQuiz: (allCorrect: boolean, wrongCount: number) => void;
  onSaveQuizResponse: (quizId: string, selectedOption: number) => void;
}

type Step = 'video' | 'quiz';

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
  onMarkVideoWatched,
  onSubmitQuiz,
  onSaveQuizResponse,
}: RamadanDayDialogProps) => {
  const [step, setStep] = useState<Step>('video');
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const quizRef = useRef<HTMLDivElement>(null);

  // Determine video playlist: prefer new multi-video list, fallback to legacy
  const playlist: DayVideo[] = videos.length > 0
    ? videos
    : videoUrl
    ? [{ id: 'legacy', video_url: videoUrl, file_name: null, display_order: 0 }]
    : [];

  const currentVideo = playlist[currentVideoIdx] ?? null;
  const totalVideos = playlist.length;
  const totalQuestions = quizzes.length;
  const currentQuiz = quizzes[currentQuestionIdx];

  const resetState = () => {
    setStep('video');
    setCurrentVideoIdx(0);
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setAnswerResult(null);
    setCorrectCount(0);
    setWrongCount(0);
    setAnsweredCount(0);
    setIsPlaying(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  };

  // Auto-play next video in playlist, or transition to quiz at end
  const handleVideoEnded = () => {
    if (!videoWatched) onMarkVideoWatched();
    if (currentVideoIdx < totalVideos - 1) {
      // Move to next video — autoplay triggers via useEffect
      setCurrentVideoIdx(prev => prev + 1);
    } else {
      // Last video ended → auto-transition to quiz
      goToQuiz();
    }
  };

  // When video index changes, auto-play the new video
  useEffect(() => {
    if (step === 'video' && videoRef.current && currentVideoIdx > 0) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [currentVideoIdx, step]);

  const goToQuiz = () => {
    setStep('quiz');
    // Scroll quiz section into view smoothly
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

  const handleValidateAnswer = () => {
    if (selectedAnswer === null || !currentQuiz) return;

    const isCorrect = selectedAnswer === currentQuiz.correct_option;
    setAnswerResult(isCorrect);
    onSaveQuizResponse(currentQuiz.id, selectedAnswer);

    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    const newWrong = wrongCount + (isCorrect ? 0 : 1);
    const newAnswered = answeredCount + 1;

    setCorrectCount(newCorrect);
    setWrongCount(newWrong);
    setAnsweredCount(newAnswered);

    setTimeout(() => {
      if (newAnswered >= totalQuestions) {
        const allCorrect = newWrong === 0;
        onSubmitQuiz(allCorrect, newWrong);
        if (!allCorrect) {
          setCurrentQuestionIdx(0);
          setSelectedAnswer(null);
          setAnswerResult(null);
          setCorrectCount(0);
          setWrongCount(0);
          setAnsweredCount(0);
        }
      } else {
        setCurrentQuestionIdx(prev => prev + 1);
        setSelectedAnswer(null);
        setAnswerResult(null);
      }
    }, 1500);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-primary to-royal-dark text-primary-foreground rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-primary-foreground">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="font-bold">{dayNumber}</span>
              </div>
              <div>
                <div className="font-bold">Jour {dayNumber}</div>
                {theme && <p className="text-sm opacity-80 font-normal">{theme}</p>}
              </div>
              {theme && (
                <Badge variant="outline" className="ml-auto border-white/30 text-white text-xs">
                  {theme}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4">
          {/* Quiz already completed */}
          {quizCompleted ? (
            <div className="text-center py-8 space-y-3">
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
            </div>
          ) : step === 'video' ? (
            /* Video step — Playlist */
            <div className="space-y-4">
              {playlist.length > 0 && currentVideo ? (
                <>
                  {/* Playlist indicator */}
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
                    {/* Custom overlay controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={() => handleSeek(-10)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-white hover:bg-white/20"
                        onClick={handlePlayPause}
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={() => handleSeek(10)}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <span className="text-white text-xs ml-1">
                        {currentVideoIdx < totalVideos - 1
                          ? `Vidéo ${currentVideoIdx + 1}/${totalVideos}`
                          : 'Dernière vidéo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {currentVideoIdx < totalVideos - 1 && (
                      <Button
                        onClick={handleSkipToNextVideo}
                        variant="outline"
                        className="flex-1"
                      >
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Vidéo suivante
                      </Button>
                    )}
                    <Button
                      onClick={handleSkipToQuiz}
                      variant="outline"
                      className="flex-1"
                    >
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
            /* Quiz step — one question at a time */
            <div ref={quizRef} className="space-y-4">
              {currentQuiz && (
                <>
                  {/* Progress indicator */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Question {currentQuestionIdx + 1}/{totalQuestions}</span>
                    <div className="flex gap-1">
                      {quizzes.map((_, idx) => (
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

                    <RadioGroup
                      value={selectedAnswer !== null ? selectedAnswer.toString() : ''}
                      onValueChange={(val) => {
                        if (answerResult === null) {
                          setSelectedAnswer(parseInt(val));
                        }
                      }}
                    >
                      {currentQuiz.options.map((option, optIdx) => (
                        <div
                          key={optIdx}
                          className={cn(
                            'flex items-center space-x-3 p-2.5 rounded-lg border transition-colors',
                            answerResult !== null && optIdx === currentQuiz.correct_option && 'border-green-500 bg-green-50',
                            answerResult === false && selectedAnswer === optIdx && optIdx !== currentQuiz.correct_option && 'border-destructive bg-destructive/10',
                            answerResult === null && 'hover:bg-muted/50'
                          )}
                        >
                          <RadioGroupItem
                            value={optIdx.toString()}
                            id={`current-q-opt${optIdx}`}
                            disabled={answerResult !== null}
                          />
                          <Label
                            htmlFor={`current-q-opt${optIdx}`}
                            className={cn(
                              'flex-1 cursor-pointer text-sm',
                              answerResult !== null && optIdx === currentQuiz.correct_option && 'text-green-700 font-medium',
                              answerResult === false && selectedAnswer === optIdx && optIdx !== currentQuiz.correct_option && 'text-destructive'
                            )}
                          >
                            {option}
                            {answerResult !== null && optIdx === currentQuiz.correct_option && ' ✓'}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {answerResult === null && (
                    <Button
                      onClick={handleValidateAnswer}
                      disabled={selectedAnswer === null}
                      className="w-full bg-gradient-to-r from-primary to-royal-dark"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Valider
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
