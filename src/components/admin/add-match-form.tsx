"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { sports } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createMatch } from "@/app/actions/match.actions";
import { matchSchema, type MatchFormValues } from "@/lib/schemas";
import { CountrySelect } from "./country-select";


export function AddMatchForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
        sport: "Cricket",
        teamA: "",
        teamB: "",
        teamALogo: "",
        teamBLogo: "",
    }
  });

  async function onSubmit(data: MatchFormValues) {
    setIsSubmitting(true);
    const result = await createMatch(data);
    
    if (result.error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error,
        });
    } else {
        toast({
            title: "Match Created",
            description: `The match has been added.`,
        });
        router.push("/admin/matches");
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sport</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a sport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sports.map((sport) => (
                            <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date and Time</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP HH:mm")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                                if (!date) return;
                                const time = field.value ? format(field.value, 'HH:mm:ss') : '00:00:00';
                                const [h, m, s] = time.split(':');
                                date.setHours(parseInt(h), parseInt(m), parseInt(s));
                                field.onChange(date);
                             }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                           <div className="p-2 border-t">
                             <Input 
                               type="time"
                               value={field.value ? format(field.value, 'HH:mm') : ''}
                               onChange={(e) => {
                                  const date = field.value || new Date();
                                  const [hours, minutes] = e.target.value.split(':');
                                  const newDate = new Date(date);
                                  newDate.setHours(parseInt(hours), parseInt(minutes));
                                  field.onChange(newDate);
                               }}
                             />
                           </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="teamA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team A Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Defaults to country name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="teamACountry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Team A Country</FormLabel>
                      <CountrySelect value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="teamB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team B Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Defaults to country name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="teamBCountry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Team B Country</FormLabel>
                      <CountrySelect value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

            </div>
            <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="teamALogo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team A Logo URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://placehold.co/40x40.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teamBLogo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team B Logo URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://placehold.co/40x40.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Match"}
        </Button>
      </form>
    </Form>
  )
}
