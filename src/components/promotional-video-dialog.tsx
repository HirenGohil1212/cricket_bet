'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X } from 'lucide-react';

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
      <DialogContent className="sm:max-w-3xl p-0 border-0 bg-transparent shadow-none">
        <DialogHeader className="sr-only">
            <DialogTitle>Promotional Video</DialogTitle>
        </DialogHeader>
        <DialogClose className="absolute -top-2 -right-2 z-10 rounded-full bg-background p-1 text-foreground/80 opacity-100 ring-offset-background transition-opacity hover:text-foreground hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
        </DialogClose>
        <div className="aspect-video">
          <iframe
            width="100%"
            height="100%"
            src={embedUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="rounded-lg"
          ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
