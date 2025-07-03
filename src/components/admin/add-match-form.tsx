
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon, UploadCloud, User, PlusCircle, Trash2 } from "lucide-react";
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
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { sports } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createMatch } from "@/app/actions/match.actions";
import { matchSchema, type MatchFormValues } from "@/lib/schemas";
import { CountrySelect } from "./country-select";
import { Separator } from "../ui/separator";


export function AddMatchForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [teamAPreview, setTeamAPreview] = React.useState<string | null>(null);
  const [teamBPreview, setTeamBPreview] = React.useState<string | null>(null);
  const [playerPreviews, setPlayerPreviews] = React.useState<{ teamA: Record<number, string>; teamB: Record<number, string> }>({ teamA: {}, teamB: {} });


  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
        sport: "Cricket",
        teamA: "",
        teamB: "",
        teamAPlayers: [],
        teamBPlayers: [],
        isSpecialMatch: false,
        allowOneSidedBets: false,
    }
  });

  const { fields: teamAPlayerFields, append: appendTeamAPlayer, remove: removeTeamAPlayer } = useFieldArray({
    control: form.control,
    name: "teamAPlayers"
  });

  const { fields: teamBPlayerFields, append: appendTeamBPlayer, remove: removeTeamBPlayer } = useFieldArray({
      control: form.control,
      name: "teamBPlayers"
  });

  const handleTeamLogoChange = (e: React.ChangeEvent<HTMLInputElement>, team: 'teamA' | 'teamB') => {
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

  const handlePlayerFileChange = (e: React.ChangeEvent<HTMLInputElement>, team: 'teamA' | 'teamB', index: number) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const fieldName = team === 'teamA' ? `teamAPlayers` : `teamBPlayers`;
            form.setValue(`${fieldName}.${index}.playerImageDataUri`, result);
            form.setValue(`${fieldName}.${index}.playerImageFile`, file);
            form.clearErrors(`${fieldName}.${index}.playerImageFile`);
            setPlayerPreviews(prev => ({
                ...prev,
                [team]: { ...prev[team], [index]: result }
            }));
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
        
        <Card>
            <CardHeader>
                <CardTitle>Match Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="isSpecialMatch"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Special Match (Player Bets)</FormLabel>
                        <FormDescription>
                          If enabled, users can place bets on individual player performance questions.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allowOneSidedBets"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Allow One-Sided Bets</FormLabel>
                        <FormDescription>
                          If enabled, users can choose to bet on questions for only one of the two teams.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
            </CardContent>
        </Card>
        
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
                                            onChange={(e) => handleTeamLogoChange(e, 'teamA')} 
                                            className="max-w-xs"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Separator />
                    <div className="space-y-4">
                        <FormLabel>Players (Optional)</FormLabel>
                        {teamAPlayerFields.map((field, index) => (
                          <div key={field.id} className="flex items-start gap-3 p-3 border rounded-md relative">
                              <FormField
                                  control={form.control}
                                  name={`teamAPlayers.${index}.playerImageFile`}
                                  render={() => (
                                      <FormItem className="flex flex-col items-center gap-2">
                                          <div className="w-16 h-16 border rounded-full flex items-center justify-center bg-muted/50 overflow-hidden">
                                              {playerPreviews.teamA?.[index] ? (
                                                  <Image src={playerPreviews.teamA[index]} alt="Player Preview" width={64} height={64} className="object-cover w-full h-full"/>
                                              ) : (
                                                  <User className="h-8 w-8 text-muted-foreground" />
                                              )}
                                          </div>
                                          <FormControl>
                                            <Input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => handlePlayerFileChange(e, 'teamA', index)} className="max-w-xs text-xs h-8" />
                                          </FormControl>
                                      </FormItem>
                                  )}
                              />
                              <div className="flex-1 space-y-2">
                                <FormField
                                    control={form.control}
                                    name={`teamAPlayers.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Player Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeTeamAPlayer(index)}>
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendTeamAPlayer({ name: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Player
                        </Button>
                        <FormMessage>{form.formState.errors.teamAPlayers?.message}</FormMessage>
                    </div>
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
                                            onChange={(e) => handleTeamLogoChange(e, 'teamB')} 
                                            className="max-w-xs"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Separator />
                    <div className="space-y-4">
                        <FormLabel>Players (Optional)</FormLabel>
                        {teamBPlayerFields.map((field, index) => (
                           <div key={field.id} className="flex items-start gap-3 p-3 border rounded-md relative">
                              <FormField
                                  control={form.control}
                                  name={`teamBPlayers.${index}.playerImageFile`}
                                  render={() => (
                                      <FormItem className="flex flex-col items-center gap-2">
                                          <div className="w-16 h-16 border rounded-full flex items-center justify-center bg-muted/50 overflow-hidden">
                                              {playerPreviews.teamB?.[index] ? (
                                                  <Image src={playerPreviews.teamB[index]} alt="Player Preview" width={64} height={64} className="object-cover w-full h-full"/>
                                              ) : (
                                                  <User className="h-8 w-8 text-muted-foreground" />
                                              )}
                                          </div>
                                          <FormControl>
                                            <Input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => handlePlayerFileChange(e, 'teamB', index)} className="max-w-xs text-xs h-8" />
                                          </FormControl>
                                      </FormItem>
                                  )}
                              />
                              <div className="flex-1 space-y-2">
                                <FormField
                                    control={form.control}
                                    name={`teamBPlayers.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Player Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeTeamBPlayer(index)}>
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendTeamBPlayer({ name: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Player
                        </Button>
                         <FormMessage>{form.formState.errors.teamBPlayers?.message}</FormMessage>
                    </div>
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
