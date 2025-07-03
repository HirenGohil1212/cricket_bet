
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import Image from "next/image";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [teamAPreview, setTeamAPreview] = React.useState<string | null>(null);
  const [teamBPreview, setTeamBPreview] = React.useState<string | null>(null);

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
        sport: "Cricket",
        teamA: "",
        teamB: "",
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, team: 'teamA' | 'teamB') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (team === 'teamA') {
          form.setValue(`teamALogoDataUri`, result);
          form.setValue(`teamALogoFile`, file); // For validation
          form.clearErrors(`teamALogoFile`);
          setTeamAPreview(result);
        } else {
          form.setValue(`teamBLogoDataUri`, result);
          form.setValue(`teamBLogoFile`, file); // For validation
          form.clearErrors(`teamBLogoFile`);
          setTeamBPreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Team A Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                        name="teamALogoFile"
                        render={() => (
                            <FormItem>
                                <FormLabel>Team A Logo (Optional)</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                            {teamAPreview ? (
                                                <Image src={teamAPreview} alt="Team A Preview" width={96} height={96} className="object-contain"/>
                                            ) : (
                                                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <Input 
                                            type="file" 
                                            accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                                            onChange={(e) => handleFileChange(e, 'teamA')} 
                                            className="max-w-xs"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Team B Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                     <FormField
                        control={form.control}
                        name="teamBLogoFile"
                        render={() => (
                            <FormItem>
                                <FormLabel>Team B Logo (Optional)</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                            {teamBPreview ? (
                                                <Image src={teamBPreview} alt="Team B Preview" width={96} height={96} className="object-contain"/>
                                            ) : (
                                                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <Input 
                                            type="file" 
                                            accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                                            onChange={(e) => handleFileChange(e, 'teamB')} 
                                            className="max-w-xs"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </div>
        
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Match"}
        </Button>
      </form>
    </Form>
  )
}
