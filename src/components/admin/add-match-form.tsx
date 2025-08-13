

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon, UploadCloud, User, PlusCircle, Trash2, Search } from "lucide-react";
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
import { sports, type Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createMatch } from "@/app/actions/match.actions";
import { matchSchema, type MatchFormValues } from "@/lib/schemas";
import { CountrySelect } from "./country-select";
import { Separator } from "../ui/separator";
import { uploadFile } from "@/lib/storage";
import { countries } from "@/lib/countries";
import { getPlayersBySport } from "@/app/actions/player.actions";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";


export function AddMatchForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [teamAPreview, setTeamAPreview] = React.useState<string | null>(null);
  const [teamBPreview, setTeamBPreview] = React.useState<string | null>(null);
  const [playerPreviews, setPlayerPreviews] = React.useState<{ teamA: Record<number, string>; teamB: Record<number, string> }>({ teamA: {}, teamB: {} });

  const [availablePlayers, setAvailablePlayers] = React.useState<Player[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = React.useState(false);


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

  const selectedSport = useWatch({ control: form.control, name: 'sport' });

  React.useEffect(() => {
    const fetchPlayers = async () => {
        if(selectedSport) {
            setIsLoadingPlayers(true);
            const players = await getPlayersBySport(selectedSport);
            setAvailablePlayers(players);
            setIsLoadingPlayers(false);
        }
    }
    fetchPlayers();
  }, [selectedSport])

  const { fields: teamAPlayerFields, append: appendTeamAPlayer, remove: removeTeamAPlayer } = useFieldArray({
    control: form.control,
    name: "teamAPlayers"
  });

  const { fields: teamBPlayerFields, append: appendTeamBPlayer, remove: removeTeamBPlayer } = useFieldArray({
      control: form.control,
      name: "teamBPlayers"
  });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'teamALogoFile' | 'teamBLogoFile' | `teamAPlayers.${number}.playerImageFile` | `teamBPlayers.${number}.playerImageFile`
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (field === 'teamALogoFile') setTeamAPreview(result);
        else if (field === 'teamBLogoFile') setTeamBPreview(result);
        else if (field.startsWith('teamAPlayers')) {
            const index = parseInt(field.split('.')[1]);
            setPlayerPreviews(prev => ({...prev, teamA: {...prev.teamA, [index]: result }}));
        } else if (field.startsWith('teamBPlayers')) {
            const index = parseInt(field.split('.')[1]);
            setPlayerPreviews(prev => ({...prev, teamB: {...prev.teamB, [index]: result }}));
        }
      };
      reader.readAsDataURL(file);
      form.setValue(field, file as any, { shouldValidate: true });
    }
  };

  async function onSubmit(data: MatchFormValues) {
    setIsSubmitting(true);
    try {
        let teamALogoUrl = `https://flagpedia.net/data/flags/w320/${data.teamACountry.toLowerCase()}.webp`;
        if (data.teamALogoFile) {
            teamALogoUrl = await uploadFile(data.teamALogoFile, 'logos');
        }

        let teamBLogoUrl = `https://flagpedia.net/data/flags/w320/${data.teamBCountry.toLowerCase()}.webp`;
        if (data.teamBLogoFile) {
            teamBLogoUrl = await uploadFile(data.teamBLogoFile, 'logos');
        }

        const processPlayers = async (players: MatchFormValues['teamAPlayers']): Promise<Player[]> => {
            const processedPlayers: Player[] = [];
            if (!players) return processedPlayers;

            for (const player of players) {
                // If player has an imageUrl, it's an existing player, so just pass it through
                // If not, it's a new player, upload image if it exists.
                let imageUrl = player.playerImageUrl || '';
                if (player.playerImageFile) {
                    imageUrl = await uploadFile(player.playerImageFile, 'players');
                }
                processedPlayers.push({ name: player.name, imageUrl });
            }
            return processedPlayers;
        }

        const teamAPlayers = await processPlayers(data.teamAPlayers);
        const teamBPlayers = await processPlayers(data.teamBPlayers);

        const countryA = countries.find(c => c.code.toLowerCase() === data.teamACountry.toLowerCase());
        const countryB = countries.find(c => c.code.toLowerCase() === data.teamBCountry.toLowerCase());

        const payload = {
            sport: data.sport,
            startTime: data.startTime,
            isSpecialMatch: data.isSpecialMatch,
            allowOneSidedBets: data.allowOneSidedBets,
            teamA: {
                name: data.teamA || countryA!.name,
                logoUrl: teamALogoUrl,
                countryCode: data.teamACountry,
                players: teamAPlayers
            },
            teamB: {
                name: data.teamB || countryB!.name,
                logoUrl: teamBLogoUrl,
                countryCode: data.teamBCountry,
                players: teamBPlayers
            }
        };

        const result = await createMatch(payload);
        
        if (result.error) {
            toast({ variant: "destructive", title: "Error", description: result.error });
        } else {
            toast({ title: "Match Created", description: `The match has been added.` });
            router.push("/admin/matches");
        }

    } catch (error: any) {
         toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload files. Please try again." });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const PlayerManager = ({ teamLetter }: { teamLetter: 'A' | 'B' }) => {
    const fieldName = teamLetter === 'A' ? 'teamAPlayers' : 'teamBPlayers';
    const { fields, append, remove } = useFieldArray({ control: form.control, name: fieldName });
    const currentPlayers = useWatch({ control: form.control, name: fieldName }) || [];
    
    const unselectedPlayers = availablePlayers.filter(p => !currentPlayers.some(cp => cp.name === p.name));
    
    return (
      <div className="space-y-4">
        <Separator />
        <FormLabel>Team {teamLetter} Players</FormLabel>
        
        {/* Render selected players */}
        <div className="space-y-2">
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 p-2 border rounded-md">
                     <Image src={field.playerImageUrl || playerPreviews[teamLetter === 'A' ? 'teamA' : 'teamB']?.[index] || `https://placehold.co/40x40.png`} alt="Player" width={40} height={40} className="rounded-full w-10 h-10 object-cover" />
                     <span className="font-medium flex-1 truncate">{field.name}</span>
                     <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}>
                         <Trash2 className="h-4 w-4 text-muted-foreground" />
                     </Button>
                </div>
            ))}
        </div>

        {/* Combobox to select existing players */}
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                    <Search className="mr-2 h-4 w-4" /> Select Existing Player
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search players..." />
                    <CommandList>
                        <CommandEmpty>No players found.</CommandEmpty>
                        <CommandGroup>
                           {unselectedPlayers.map(player => (
                               <CommandItem
                                   key={player.id}
                                   onSelect={() => append({ name: player.name, playerImageUrl: player.imageUrl })}
                               >
                                   <Image src={player.imageUrl} alt={player.name} width={24} height={24} className="mr-2 rounded-full h-6 w-6 object-cover" />
                                   {player.name}
                               </CommandItem>
                           ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>

        {/* Button to add new player fields */}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', playerImageUrl: '', playerImageFile: undefined })}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Player Manually
        </Button>
        <FormMessage>{(form.formState.errors as any)[fieldName]?.message}</FormMessage>
        
        {/* Fields for manually adding new players */}
         <div className="space-y-4">
            {fields.map((field, index) => {
                if (field.playerImageUrl) return null; // Don't show inputs for existing players
                return (
                    <div key={field.id} className="flex items-start gap-3 p-3 border rounded-md relative border-dashed">
                        <FormField
                            control={form.control}
                            name={`${fieldName}.${index}.playerImageFile`}
                            render={() => (
                                <FormItem className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 border rounded-full flex items-center justify-center bg-muted/50 overflow-hidden">
                                        {playerPreviews[teamLetter === 'A' ? 'teamA' : 'teamB']?.[index] ? (
                                            <Image src={playerPreviews[teamLetter === 'A' ? 'teamA' : 'teamB'][index]} alt="Player Preview" width={64} height={64} className="object-cover w-full h-full"/>
                                        ) : (
                                            <User className="h-8 w-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <FormControl>
                                      <Input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e, `${fieldName}.${index}.playerImageFile`)} className="max-w-xs text-xs h-8" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <div className="flex-1 space-y-2">
                          <FormField
                              control={form.control}
                              name={`${fieldName}.${index}.name`}
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-xs">New Player Name</FormLabel>
                                      <FormControl>
                                          <Input placeholder="Enter name" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                )
            })}
        </div>
      </div>
    );
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
                                            onChange={(e) => handleFileChange(e, 'teamALogoFile')} 
                                            className="max-w-xs"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <PlayerManager teamLetter="A" />
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
                                            onChange={(e) => handleFileChange(e, 'teamBLogoFile')} 
                                            className="max-w-xs"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <PlayerManager teamLetter="B" />
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

