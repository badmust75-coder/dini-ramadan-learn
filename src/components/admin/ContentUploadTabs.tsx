/**
 * ContentUploadTabs — Reusable 3-tab upload component (File/YouTube/Audio)
 * Used across all admin content managers.
 */
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload } from 'lucide-react';

interface ContentUploadTabsProps {
  onUploadFile: (file: File) => void;
  onAddYoutubeLink: (embedUrl: string) => void;
  onUploadAudio: (file: File) => void;
  isUploading?: boolean;
  disabled?: boolean;
}

export const convertYoutubeToEmbed = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
};

const ContentUploadTabs = ({
  onUploadFile,
  onAddYoutubeLink,
  onUploadAudio,
  isUploading = false,
  disabled = false,
}: ContentUploadTabsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [youtubeLink, setYoutubeLink] = useState('');
  const [ytError, setYtError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = '';
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadAudio(file);
    e.target.value = '';
  };

  const handleAddYoutube = () => {
    const embedUrl = convertYoutubeToEmbed(youtubeLink.trim());
    if (!embedUrl) {
      setYtError('Lien YouTube invalide');
      return;
    }
    setYtError('');
    onAddYoutubeLink(embedUrl);
    setYoutubeLink('');
  };

  return (
    <Tabs defaultValue="file" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="file" className="flex-1 text-xs">📄 Fichier</TabsTrigger>
        <TabsTrigger value="youtube" className="flex-1 text-xs">🔗 Lien YouTube</TabsTrigger>
        <TabsTrigger value="audio" className="flex-1 text-xs">🎵 Audio</TabsTrigger>
      </TabsList>

      <TabsContent value="file">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          variant="outline"
          className="w-full"
        >
          {isUploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Téléversement...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Ajouter un fichier (PDF, DOC)</>
          )}
        </Button>
      </TabsContent>

      <TabsContent value="youtube">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={youtubeLink}
              onChange={(e) => { setYoutubeLink(e.target.value); setYtError(''); }}
              placeholder="Colle ton lien YouTube ici..."
              className="flex-1"
            />
            <Button
              disabled={!youtubeLink.trim() || isUploading || disabled}
              onClick={handleAddYoutube}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter'}
            </Button>
          </div>
          {ytError && <p className="text-xs text-destructive">{ytError}</p>}
        </div>
      </TabsContent>

      <TabsContent value="audio">
        <input
          ref={audioInputRef}
          type="file"
          accept=".mp3,.m4a,.wav,.ogg"
          onChange={handleAudioSelect}
          className="hidden"
        />
        <Button
          onClick={() => audioInputRef.current?.click()}
          disabled={isUploading || disabled}
          variant="outline"
          className="w-full"
        >
          {isUploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Téléversement...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Ajouter un audio (MP3, M4A, WAV)</>
          )}
        </Button>
      </TabsContent>
    </Tabs>
  );
};

export default ContentUploadTabs;
