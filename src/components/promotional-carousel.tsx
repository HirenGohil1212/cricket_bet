
"use client"

import * as React from "react"
import Autoplay from "embla-carousel-autoplay"

import { Card } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from "next/image"
import type { Banner } from "@/lib/types"

interface PromotionalCarouselProps {
    banners?: Banner[] | null;
}

export function PromotionalCarousel({ banners }: PromotionalCarouselProps) {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full mb-6"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{
        loop: true,
      }}
    >
      <CarouselContent>
        {banners.map((banner, index) => (
          <CarouselItem key={banner.id || index}>
            <Card className="overflow-hidden">
                <div className="relative aspect-video">
                  <Image
                    src={banner.imageUrl}
                    alt={`Promotional banner ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      {banners.length > 1 && (
        <>
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2" />
        </>
      )}
    </Carousel>
  )
}
