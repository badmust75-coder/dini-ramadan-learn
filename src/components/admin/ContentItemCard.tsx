/**
 * ContentItemCard — Displays an uploaded content item as a clickable card
 * with editable title, type icon, and delete button.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export type ContentType = 'fichier' | 'youtube' | 'audio';

interface ContentItemCardProps {
  id: string;
  title: string;
  contentType: ContentType;
  url: string;
  onDelete: (id: string) => void;
  onUpdateTitle?: (id: string, newTitle: string) => void;
  deleteDisabled?: boolean;
}

const getIcon = (type: ContentType) => {
  switch (type) {
    case 'fichier': return '📄';
    case 'youtube': return '🎬';
    case 'audio': return '🎵';
  }
};

const ContentItemCard = ({
  id,
  title,
  contentType,
  url,
  onDelete,
  onUpdateTitle,
  deleteDisabled,
}: ContentItemCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleSaveTitle = () => {
    if (onUpdateTitle && editTitle.trim() !== title) {
      onUpdateTitle(id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleClick = () => {
    if (contentType === 'fichier') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setPreviewOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2.5 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
        {/* Icon + clickable area */}
        <button
          onClick={handleClick}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <span className="text-lg shrink-0">{getIcon(contentType)}</span>
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); }}
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleSaveTitle}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span
              className="text-sm truncate cursor-pointer hover:underline"
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onUpdateTitle) setIsEditing(true);
              }}
            >
              {title}
            </span>
          )}
        </button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(id); }}
          disabled={deleteDisabled}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Preview dialog for YouTube and Audio */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <div className="space-y-3">
            <p className="font-semibold text-sm">{title}</p>
            {contentType === 'youtube' && (
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={url}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ border: 'none' }}
                />
              </div>
            )}
            {contentType === 'audio' && (
              <audio src={url} controls className="w-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContentItemCard;
