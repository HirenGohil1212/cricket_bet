"use client"

import * as React from "react"
import Autoplay from "embla-carousel-autoplay"

import { Card } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
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
                <div className="relative w-full">
                  <Image
                    src={banner.imageUrl}
                    alt={`Promotional banner ${index + 1}`}
                    width={1200}
                    height={224}
                    className="object-contain w-full h-auto"
                    quality={100}
                    priority={index === 0}
                  />
                </div>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
