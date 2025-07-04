import Image from 'next/image';
import { Card } from '@/components/ui/card';

interface BannerAdProps {
  imageUrl?: string | null;
}

export function BannerAd({ imageUrl }: BannerAdProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="relative h-32">
        <Image
          src={imageUrl}
          alt="Promotional Banner"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    </Card>
  );
}
