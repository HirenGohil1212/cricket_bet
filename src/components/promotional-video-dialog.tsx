
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PromotionalVideoDialogProps {
  videoUrl: string;
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
      return null; // Not a youtube URL, handled by direct video tag
    }
  } catch (e) {
    console.warn("Could not parse as YouTube URL:", url);
    return null; // Might be a direct video URL
  }
  
  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
}

export function PromotionalVideoDialog({ videoUrl, isOpen, onOpenChange }: PromotionalVideoDialogProps) {
  const youtubeEmbedUrl = getYouTubeEmbedUrl(videoUrl);

  const renderVideo = () => {
    if (youtubeEmbedUrl) {
      return (
        <iframe
            width="100%"
            height="100%"
            src={youtubeEmbedUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="rounded-lg"
        ></iframe>
      );
    }
    // Fallback to a standard video tag for direct MP4 URLs
    return (
        <video
            src={videoUrl}
            width="100%"
            height="100%"
            controls
            autoPlay
            muted
            className="rounded-lg"
        />
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 border-0 bg-transparent shadow-none">
        <DialogHeader className="sr-only">
            <DialogTitle>Promotional Video</DialogTitle>
        </DialogHeader>
        <div className="aspect-video">
          {renderVideo()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
