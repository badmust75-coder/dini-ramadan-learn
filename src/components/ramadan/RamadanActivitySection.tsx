import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Video, Music, Download, Eye, Printer, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Activity {
  id: string;
  day_id: number;
  type: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  order_index: number;
}

interface RamadanActivitySectionProps {
  dayId: number;
}

const getTypeBadge = (type: string, fileType: string | null) => {
  if (type === 'document') {
    if (fileType === 'pdf') return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px]">PDF</Badge>;
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">Image</Badge>;
  }
  if (type === 'video') return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px]">Vidéo</Badge>;
  if (type === 'audio') return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px]">Audio</Badge>;
  return null;
};

const DocumentCard = ({ activity }: { activity: Activity }) => {
  const [viewOpen, setViewOpen] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = activity.file_url;
    a.download = activity.file_name;
    a.target = '_blank';
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open(activity.file_url, '_blank');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate flex-1">{activity.file_name}</span>
          {getTypeBadge(activity.type, activity.file_type)}
        </div>
        {activity.file_type !== 'pdf' && (
          <img src={activity.file_url} className="w-full rounded-lg object-contain max-h-48" alt={activity.file_name} />
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
            <Eye className="h-3 w-3 mr-1" />Voir
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3 w-3 mr-1" />Télécharger
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-3 w-3 mr-1" />Imprimer
          </Button>
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl w-full h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 shrink-0">
            <DialogTitle className="text-sm truncate">{activity.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-2">
            {activity.file_type === 'pdf' ? (
              <iframe src={activity.file_url} className="w-full h-full rounded" title={activity.file_name} />
            ) : (
              <img src={activity.file_url} className="w-full h-auto object-contain" alt={activity.file_name} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const VideoCard = ({ activity }: { activity: Activity }) => {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = activity.file_url;
    a.download = activity.file_name;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate flex-1">{activity.file_name}</span>
        {getTypeBadge(activity.type, activity.file_type)}
      </div>
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <video src={activity.file_url} controls className="w-full h-full" />
      </div>
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="h-3 w-3 mr-1" />Télécharger
      </Button>
    </div>
  );
};

const AudioCard = ({ activity }: { activity: Activity }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = activity.file_url;
    a.download = activity.file_name;
    a.target = '_blank';
    a.click();
  };

  const handleSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate flex-1">{activity.file_name}</span>
        {getTypeBadge(activity.type, activity.file_type)}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />Télécharger
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-xs text-muted-foreground font-medium">
              ⏩ Vitesse de lecture
            </DropdownMenuItem>
            {[0.75, 1, 1.25, 1.5, 2].map(rate => (
              <DropdownMenuItem key={rate} onClick={() => handleSpeed(rate)} className="pl-8">
                {rate === playbackRate ? '✓ ' : ''}{rate}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <audio ref={audioRef} src={activity.file_url} controls className="w-full h-10" />
    </div>
  );
};

const RamadanActivitySection = ({ dayId }: RamadanActivitySectionProps) => {
  const { data: activities = [] } = useQuery({
    queryKey: ['ramadan-day-activities', dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_day_activities')
        .select('*')
        .eq('day_id', dayId)
        .order('order_index');
      if (error) throw error;
      return data as Activity[];
    },
  });

  if (activities.length === 0) return null;

  return (
    <div className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        📋 Activité du jour
        <Badge variant="secondary" className="text-[10px]">{activities.length}</Badge>
      </h3>
      <div className="space-y-3">
        {activities.map(activity => {
          switch (activity.type) {
            case 'document': return <DocumentCard key={activity.id} activity={activity} />;
            case 'video': return <VideoCard key={activity.id} activity={activity} />;
            case 'audio': return <AudioCard key={activity.id} activity={activity} />;
            default: return null;
          }
        })}
      </div>
    </div>
  );
};

export default RamadanActivitySection;
