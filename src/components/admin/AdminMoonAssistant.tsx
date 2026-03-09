import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, Send, Moon, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  id: string;
  text: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  pendingAction?: any;
}

const AdminMoonAssistant = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const moonRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
      const saved = localStorage.getItem('adminMoon-position');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          x: Math.max(0, Math.min(parsed.x || 0, window.innerWidth - 80)),
          y: Math.max(0, Math.min(parsed.y || 0, window.innerHeight - 120))
        };
      }
    } catch {}
    return { x: 16, y: Math.max(0, window.innerHeight - 120) };
  });
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('adminMoon-position', JSON.stringify(position));
    } catch {}
  }, [position]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: Date.now().toString(),
        text: '🌙 Salam ! Je suis votre Assistant Lune, prêt à vous aider dans la gestion de votre application. Que puis-je faire pour vous ?',
        type: 'assistant',
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!moonRef.current) return;
    const rect = moonRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
    setHasMoved(false);
    moonRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setHasMoved(true);
    const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 56));
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 56));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (!hasMoved) {
      setIsOpen(prev => !prev);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-assistant', {
        body: {
          message: userMsg.text,
          conversationHistory: messages.slice(-20) // Send last 20 messages for context
        }
      });

      if (error) throw error;

      const responseText = data?.response || '🌙 Désolé, je n\'ai pas pu traiter votre demande.';

      // Check if response contains an action block
      let pendingAction = null;
      const actionMatch = responseText.match(/```action\n([\s\S]*?)\n```/);
      if (actionMatch) {
        try {
          pendingAction = JSON.parse(actionMatch[1]);
        } catch {}
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: responseText.replace(/```action\n[\s\S]*?\n```/g, '').trim(),
        type: 'assistant',
        timestamp: new Date(),
        pendingAction
      }]);
    } catch (err) {
      console.error('Assistant error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: '🌙 Une erreur est survenue. Veuillez réessayer.',
        type: 'assistant',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async (msg: Message) => {
    if (!msg.pendingAction) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-assistant', {
        body: { action: msg.pendingAction }
      });

      if (error) throw error;

      // Remove pending action from message
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, pendingAction: undefined } : m
      ));

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: data?.response || '🌙 Action exécutée.',
        type: 'assistant',
        timestamp: new Date()
      }]);

      toast({ title: "Action exécutée", description: msg.pendingAction.description });
    } catch (err) {
      toast({ title: "Erreur", description: "L'action a échoué", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const rejectAction = (msg: Message) => {
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, pendingAction: undefined } : m
    ));
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: '🌙 Action annulée. Que puis-je faire d\'autre ?',
      type: 'assistant',
      timestamp: new Date()
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      {/* Floating Moon Button */}
      <button
        ref={moonRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="fixed z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg select-none touch-none transition-transform"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          transform: isDragging ? 'scale(1.15)' : 'scale(1)',
          cursor: isDragging ? 'grabbing' : 'pointer',
        }}
        aria-label="Assistant Admin"
      >
        <Moon className="h-7 w-7 text-white" fill="white" />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <Card
          className="fixed z-[9998] shadow-2xl border-2 border-amber-400/30 flex flex-col"
          style={{
            bottom: '16px',
            right: '16px',
            width: 'min(420px, calc(100vw - 32px))',
            height: 'min(600px, calc(100vh - 100px))',
          }}
        >
          <CardHeader className="pb-2 pr-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-t-lg">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Moon className="h-5 w-5" fill="white" />
              Assistant Admin
            </CardTitle>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.type === 'user'
                        ? 'bg-amber-500 text-white rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      
                      {msg.pendingAction && (
                        <div className="mt-2 p-2 bg-background/50 rounded-lg border border-amber-300">
                          <p className="text-xs font-medium mb-2">⚠️ Action proposée : {msg.pendingAction.description}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => confirmAction(msg)}
                              disabled={isLoading}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirmer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-red-400 text-red-500 hover:bg-red-50"
                              onClick={() => rejectAction(msg)}
                              disabled={isLoading}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t flex gap-2">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question..."
                className="min-h-[40px] max-h-[100px] resize-none text-sm"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputText.trim() || isLoading}
                size="icon"
                className="h-10 w-10 shrink-0 bg-amber-500 hover:bg-amber-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AdminMoonAssistant;
