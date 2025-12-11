
"use client"

import * as React from "react"
import Autoplay from "embla-carousel-autoplay"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from "next/image"

const placeholderImages = [
  { src: "https://picsum.photos/seed/1/800/400", alt: "Promotional image 1", hint: "sports betting" },
  { src: "https://picsum.photos/seed/2/800/400", alt: "Promotional image 2", hint: "live match" },
  { src: "https://picsum.photos/seed/3/800/400", alt: "Promotional image 3", hint: "winner bonus" },
  { src: "https://picsum.photos/seed/4/800/400", alt: "Promotional image 4", hint: "new game" },
];

export function PromotionalCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )

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
        {placeholderImages.map((image, index) => (
          <CarouselItem key={index}>
            <Card className="overflow-hidden">
                <div className="relative aspect-video">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover"
                    data-ai-hint={image.hint}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2" />
      <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2" />
    </Carousel>
  )
}
