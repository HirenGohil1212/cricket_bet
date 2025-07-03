
"use client"

import * as React from "react"
import Image from "next/image"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { countries } from "@/lib/countries"

interface CountrySelectProps {
  value?: string;
  onChange: (value: string) => void;
}

export function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)
  
  const selectedCountry = countries.find(
    (country) => country.code.toLowerCase() === value?.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value && selectedCountry ? (
            <div className="flex items-center gap-2">
              <Image
                src={`https://flagpedia.net/data/flags/w40/${selectedCountry.code.toLowerCase()}.webp`}
                alt={selectedCountry.name}
                width={20}
                height={15}
                className="object-contain"
              />
              {selectedCountry.name}
            </div>
          ) : (
            "Select country..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    const newCode = country.code.toLowerCase();
                    onChange(value?.toLowerCase() === newCode ? "" : newCode);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === country.code.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                   <div className="flex items-center gap-2">
                    <Image
                      src={`https://flagpedia.net/data/flags/w40/${country.code.toLowerCase()}.webp`}
                      alt={country.name}
                      width={20}
                      height={15}
                      className="object-contain"
                    />
                    {country.name}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
