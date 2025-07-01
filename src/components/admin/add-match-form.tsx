"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

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
import type { Sport } from "@/lib/types";
import { cn } from "@/lib/utils";

const sports: Sport[] = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"];

const addMatchFormSchema = z.object({
  sport: z.enum(sports, { required_error: "Please select a sport." }),
  teamA: z.string().min(2, { message: "Team A name must be at least 2 characters." }),
  teamB: z.string().min(2, { message: "Team B name must be at least 2 characters." }),
  teamALogo: z.string().url({ message: "Please enter a valid URL for Team A logo." }).optional().or(z.literal('')),
  teamBLogo: z.string().url({ message: "Please enter a valid URL for Team B logo." }).optional().or(z.literal('')),
  startTime: z.date({ required_error: "A start date and time is required." }),
});

type AddMatchFormValues = z.infer<typeof addMatchFormSchema>;

export function AddMatchForm() {
  const { toast } = useToast();
  const form = useForm<AddMatchFormValues>({
    resolver: zodResolver(addMatchFormSchema),
  });

  // In a real app, this would call a server action to save to Firestore
  function onSubmit(data: AddMatchFormValues) {
    console.log(data);
    toast({
      title: "Match Created (Simulated)",
      description: `${data.teamA} vs ${data.teamB} has been added.`,
    });
    form.reset();
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
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
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
                      <FormLabel>Team A Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Warriors" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teamB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team B Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Titans" {...field} />
                      </FormControl>
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
                      <FormLabel>Team A Logo URL</FormLabel>
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
                      <FormLabel>Team B Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://placehold.co/40x40.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
        </div>

        <Button type="submit">Create Match</Button>
      </form>
    </Form>
  )
}
