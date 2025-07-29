'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PromotionalVideoDialogProps {
  youtubeUrl: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  let videoId;

  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.substring(1);
    } else if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname.startsWith('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1];
      } else {
        videoId = urlObj.searchParams.get('v');
      }
    } else {
      return null; // Not a youtube URL
    }
  } catch (e) {
    console.error("Invalid YouTube URL provided:", url);
    return null;
  }
  
  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
}

export function PromotionalVideoDialog({ youtubeUrl, isOpen, onOpenChange }: PromotionalVideoDialogProps) {
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);

  if (!embedUrl) {
    return null; // Don't render dialog if URL is invalid
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-2">
        <DialogHeader className="sr-only">
            <DialogTitle>Promotional Video</DialogTitle>
        </DialogHeader>
        <div className="aspect-video">
          <iframe
            width="100%"
            height="100%"
            src={embedUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="rounded-md"
          ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
