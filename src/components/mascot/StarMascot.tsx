import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Star, Heart, BookOpen, Search, Navigation } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useUserProgress } from '@/hooks/useUserProgress';

interface Message {
  id: string;
  text: string;
  type: 'mascot' | 'user';
  timestamp: Date;
}

interface MascotAction {
  id: string;
  text: string;
  icon: React.ReactNode;
  action: () => void;
}

const StarMascot = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: progress } = useUserProgress();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);

  // Get user age from profile
  useEffect(() => {
    const getUserAge = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('age, date_of_birth')
          .eq('user_id', user.id)
          .single();

        if (profile?.age) {
          setUserAge(profile.age);
        } else if (profile?.date_of_birth) {
          const age = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear();
          setUserAge(age);
        }
      } catch (error) {
        console.error('Error fetching user age:', error);
      }
    };

    getUserAge();
  }, [user]);

  // Welcome message when opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = getWelcomeMessage();
      setMessages([{
        id: Date.now().toString(),
        text: welcomeMessage,
        type: 'mascot',
        timestamp: new Date()
      }]);
    }
  }, [isOpen, userAge]);

  const getWelcomeMessage = () => {
    const name = user?.user_metadata?.full_name || 'mon petit élève';
    
    if (!userAge) {
      return `✨ Salam ${name} ! Je suis ton étoile guide ! Comment puis-je t'aider aujourd'hui ?`;
    }
    
    if (userAge <= 6) {
      return `✨ Salam ${name} ! Je suis ton amie étoile ! Tu veux apprendre quelque chose de beau ?`;
    } else if (userAge <= 10) {
      return `✨ Salam ${name} ! Prêt pour une belle leçon ? Je peux t'aider à réviser ou découvrir de nouveaux modules !`;
    } else {
      return `✨ Salam ${name} ! Je peux t'aider à réviser, naviguer dans l'app ou même faire des recherches éducatives !`;
    }
  };

  const getQuickActions = (): MascotAction[] => {
    const actions: MascotAction[] = [];

    // Age-appropriate quick actions
    if (userAge && userAge <= 6) {
      actions.push(
        {
          id: 'alphabet',
          text: 'Apprendre les lettres',
          icon: <BookOpen className="h-4 w-4" />,
          action: () => navigate('/alphabet')
        },
        {
          id: 'encourage',
          text: 'Dis-moi quelque chose de gentil',
          icon: <Heart className="h-4 w-4" />,
          action: () => addMascotMessage(getEncouragementMessage())
        }
      );
    } else if (userAge && userAge <= 10) {
      actions.push(
        {
          id: 'review',
          text: 'Que dois-je réviser ?',
          icon: <BookOpen className="h-4 w-4" />,
          action: () => suggestReview()
        },
        {
          id: 'navigate',
          text: 'Aide-moi à naviguer',
          icon: <Navigation className="h-4 w-4" />,
          action: () => showNavigationHelp()
        }
      );
    } else if (userAge && userAge >= 12) {
      actions.push(
        {
          id: 'review',
          text: 'Que dois-je réviser ?',
          icon: <BookOpen className="h-4 w-4" />,
          action: () => suggestReview()
        },
        {
          id: 'search',
          text: 'Recherche éducative',
          icon: <Search className="h-4 w-4" />,
          action: () => addMascotMessage('🔍 Pose-moi une question et je ferai une recherche éducative pour toi !')
        }
      );
    }

    return actions;
  };

  const addMascotMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      type: 'mascot',
      timestamp: new Date()
    }]);
  };

  const getEncouragementMessage = () => {
    const encouragements = [
      "🌟 Tu es formidable ! Continue comme ça !",
      "💫 Chaque effort compte, tu progresses très bien !",
      "✨ Allah récompense ceux qui apprennent, bravo !",
      "🎯 Tu es sur le bon chemin, continue !",
      "🏆 Je suis fière de toi, petit champion !"
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  };

  const suggestReview = () => {
    if (!progress) {
      addMascotMessage("📚 Va voir tes modules pour commencer ton apprentissage !");
      return;
    }

    const suggestions = [];
    
    // Check progress in different modules
    if (progress.sourates && progress.sourates.validated < progress.sourates.total) {
      suggestions.push(`📖 Tu as ${progress.sourates.total - progress.sourates.validated} sourate(s) à valider`);
    }
    if (progress.nourania && progress.nourania.validated < progress.nourania.total) {
      suggestions.push(`📝 Il reste ${progress.nourania.total - progress.nourania.validated} leçon(s) Nourania`);
    }
    if (progress.invocations && progress.invocations.memorized < progress.invocations.total) {
      suggestions.push(`🤲 Tu peux mémoriser plus d'invocations`);
    }

    if (suggestions.length === 0) {
      addMascotMessage("🎉 Bravo ! Tu progresses très bien ! Continue comme ça !");
    } else {
      addMascotMessage(`📚 Je te suggère de travailler sur :\n• ${suggestions.join('\n• ')}`);
    }
  };

  const showNavigationHelp = () => {
    addMascotMessage(`
🧭 Voici comment naviguer :

📖 **Sourates** : Apprends le Coran étape par étape
🤲 **Invocations** : Belles prières du quotidien
📝 **Nourania** : Méthode de lecture coranique
🕌 **Prière** : Horaires et apprentissage
🌙 **Ramadan** : Activités du mois sacré
🔤 **Alphabet** : Lettres arabes

Clique sur n'importe quel module pour commencer !
    `);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // For 12+ users, use AI for more complex questions
      if (userAge && userAge >= 12) {
        const { data, error } = await supabase.functions.invoke('mascot-chat', {
          body: { 
            message: text,
            userAge,
            context: 'Islamic learning app with sourates, invocations, nourania, prayer times'
          }
        });

        if (error) throw error;
        
        addMascotMessage(data.response);
      } else {
        // Simple responses for younger users
        addMascotMessage(getSimpleResponse(text));
      }
    } catch (error) {
      console.error('Error:', error);
      addMascotMessage("😅 Désolée, je n'ai pas compris. Peux-tu reformuler ?");
    } finally {
      setIsLoading(false);
    }
  };

  const getSimpleResponse = (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('salam') || lowerMessage.includes('bonjour')) {
      return "✨ Wa alaykum salam ! Comment ça va ?";
    }
    if (lowerMessage.includes('merci') || lowerMessage.includes('shukran')) {
      return "💖 De rien ! C'est un plaisir de t'aider !";
    }
    if (lowerMessage.includes('aide') || lowerMessage.includes('comment')) {
      return "🤗 Je suis là pour t'aider ! Clique sur les boutons pour commencer !";
    }
    
    return getEncouragementMessage();
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Star Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-300 hover:via-yellow-400 hover:to-amber-400 shadow-lg hover:shadow-xl transition-all duration-300 p-0 group"
      >
        <Star className="h-8 w-8 text-white drop-shadow-md group-hover:scale-110 transition-transform animate-pulse" />
      </Button>

      {/* Mascot Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <Card className="w-full max-w-md max-h-[80vh] bg-gradient-to-br from-yellow-50 via-background to-amber-50 border-2 border-yellow-300">
            <CardHeader className="pr-8 relative">
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                <CardTitle className="text-lg">✨ Ton Étoile Guide</CardTitle>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 p-0"
                size="sm"
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Messages */}
              <div className="max-h-60 overflow-y-auto space-y-3 bg-background/50 rounded-lg p-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-yellow-100 text-foreground border border-yellow-300'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{message.text}</p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-yellow-100 p-3 rounded-2xl border border-yellow-300">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              {messages.length <= 1 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">Actions rapides :</p>
                  <div className="flex flex-wrap gap-2">
                    {getQuickActions().map((action) => (
                      <Button
                        key={action.id}
                        onClick={action.action}
                        variant="outline"
                        size="sm"
                        className="text-xs hover:bg-yellow-100"
                      >
                        {action.icon}
                        {action.text}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Age Badge */}
              {userAge && (
                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-xs">
                    {userAge <= 6 ? '👶 Mode Petit' : userAge <= 10 ? '🧒 Mode Enfant' : '👦 Mode Ado'}
                  </Badge>
                </div>
              )}

              {/* Input for older kids */}
              {userAge && userAge >= 7 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                    placeholder={userAge >= 12 ? "Pose-moi une question..." : "Dis-moi quelque chose..."}
                    className="flex-1 px-3 py-2 text-sm border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-background text-foreground"
                  />
                  <Button
                    onClick={() => handleSendMessage(inputText)}
                    size="sm"
                    disabled={isLoading || !inputText.trim()}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '💫'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default StarMascot;