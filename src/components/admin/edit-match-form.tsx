
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon, UploadCloud, User, PlusCircle, Trash2, Search, ChevronsUpDown, Check, MessageSquare, Save } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { sports, type Match, type Player, type Question, type DummyUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { updateMatch } from "@/app/actions/match.actions";
import { matchSchema, type MatchFormValues } from "@/lib/schemas";
import { CountrySelect } from "./country-select";
import { Separator } from "../ui/separator";
import { uploadFile } from "@/lib/storage";
import { countries } from "@/lib/countries";
import { getPlayersBySport, createPlayer } from "@/app/actions/player.actions";
import { getQuestionsForMatch, getQuestionsFromBank } from "@/app/actions/qna.actions";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { getDummyUsersBySport } from "@/app/actions/dummy-user.actions";

interface EditMatchFormProps {
    match: Match;
}

function EditMatchFormSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
            <Skeleton className="h-10 w-32" />
        </div>
    );
}


export function EditMatchForm({ match }: EditMatchFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFormReady, setIsFormReady] = React.useState(false);

  const [teamAPreview, setTeamAPreview] = React.useState<string | null>(match.teamA.logoUrl);
  const [teamBPreview, setTeamBPreview] = React.useState<string | null>(match.teamB.logoUrl);
  const [playerPreviews, setPlayerPreviews] = React.useState<{ teamA: Record<number, string>; teamB: Record<number, string> }>({ teamA: {}, teamB: {} });
  const [availablePlayers, setAvailablePlayers] = React.useState<Player[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = React.useState(false);
  const [questionBank, setQuestionBank] = React.useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = React.useState(false);
  const [availableDummyUsers, setAvailableDummyUsers] = React.useState<DummyUser[]>([]);
  const [isLoadingDummyUsers, setIsLoadingDummyUsers] = React.useState(false);
  
  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
  });
  
  React.useEffect(() => {
    const initializeForm = async () => {
        try {
            const questions = await getQuestionsForMatch(match.id);
            form.reset({
                sport: match.sport,
                teamA: match.teamA.name,
                teamB: match.teamB.name,
                teamACountry: match.teamA.countryCode,
                teamBCountry: match.teamB.countryCode,
                startTime: new Date(match.startTime),
                isSpecialMatch: match.isSpecialMatch || false,
                allowOneSidedBets: match.allowOneSidedBets || false,
                teamAPlayers: match.teamA.players?.map(p => ({ name: p.name, playerImageUrl: p.imageUrl, imagePath: p.imagePath, bettingEnabled: p.bettingEnabled ?? true })) || [],
                teamBPlayers: match.teamB.players?.map(p => ({ name: p.name, playerImageUrl: p.imageUrl, imagePath: p.imagePath, bettingEnabled: p.bettingEnabled ?? true })) || [],
                questions: questions.length > 0 ? questions.map(q => ({ question: q.question })) : [],
                dummyWinners: match.dummyWinners?.map(dw => ({userId: dw.userId, amount: dw.amount})) || [],
            });
            setIsFormReady(true);
        } catch (error) {
            console.error("Failed to initialize form:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load match data.' });
        }
    };
    initializeForm();
  }, [match, form, toast]);


  const selectedSport = useWatch({ control: form.control, name: 'sport' });

  React.useEffect(() => {
    const fetchSportSpecificData = async () => {
        if(selectedSport) {
            setIsLoadingPlayers(true);
            setIsLoadingDummyUsers(true);
            const players = await getPlayersBySport(selectedSport);
            const dummyUsers = await getDummyUsersBySport(selectedSport);
            setAvailablePlayers(players);
            setAvailableDummyUsers(dummyUsers);
            setIsLoadingPlayers(false);
            setIsLoadingDummyUsers(false);
        }
    }
    fetchSportSpecificData();
  }, [selectedSport]);

  React.useEffect(() => {
    const fetchQuestions = async () => {
        setIsLoadingQuestions(true);
        const questions = await getQuestionsFromBank();
        setQuestionBank(questions);
        setIsLoadingQuestions(false);
    }
    fetchQuestions();
  }, []);
  
  const { fields: questionFields, append: appendQuestion, remove: removeQuestion, replace: replaceQuestions } = useFieldArray({
    control: form.control,
    name: "questions"
  });

  const { fields: dummyWinnerFields, append: appendDummyWinner, remove: removeDummyWinner } = useFieldArray({
    control: form.control,
    name: "dummyWinners"
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
      form.setValue(field as any, file, { shouldValidate: true });
    }
  };

  async function onSubmit(data: MatchFormValues) {
    setIsSubmitting(true);
    
    try {
        let teamALogoUrl = match.teamA.logoUrl;
        let teamALogoPath = match.teamA.logoPath;
        if (data.teamALogoFile) {
            const { downloadUrl, storagePath } = await uploadFile(data.teamALogoFile, 'logos');
            teamALogoUrl = downloadUrl;
            teamALogoPath = storagePath;
        }

        let teamBLogoUrl = match.teamB.logoUrl;
        let teamBLogoPath = match.teamB.logoPath;
        if (data.teamBLogoFile) {
            const { downloadUrl, storagePath } = await uploadFile(data.teamBLogoFile, 'logos');
            teamBLogoUrl = downloadUrl;
            teamBLogoPath = storagePath;
        }
        
        const processPlayers = async (newPlayers: MatchFormValues['teamAPlayers']): Promise<Player[]> => {
            const processedPlayers: Player[] = [];
            if (!newPlayers) return processedPlayers;

            for (const player of newPlayers) {
                let imageUrl = player.playerImageUrl || '';
                let imagePath = player.imagePath || '';
                if (player.playerImageFile) {
                    const { downloadUrl, storagePath } = await uploadFile(player.playerImageFile, 'players');
                    imageUrl = downloadUrl;
                    imagePath = storagePath;
                }
                processedPlayers.push({ name: player.name, imageUrl, imagePath, bettingEnabled: player.bettingEnabled });
            }
            return processedPlayers;
        };

        const teamAPlayers = await processPlayers(data.teamAPlayers);
        const teamBPlayers = await processPlayers(data.teamBPlayers);

        const countryA = countries.find(c => c.code.toLowerCase() === data.teamACountry.toLowerCase());
        const countryB = countries.find(c => c.code.toLowerCase() === data.teamBCountry.toLowerCase());

        const payload = {
            sport: data.sport,
            startTime: data.startTime,
            isSpecialMatch: data.isSpecialMatch,
            allowOneSidedBets: data.allowOneSidedBets,
            questions: data.questions,
            dummyWinners: data.dummyWinners?.map(dw => ({userId: dw.userId, amount: dw.amount})),
            teamA: {
                name: data.teamA || countryA!.name,
                logoUrl: teamALogoUrl,
                logoPath: teamALogoPath,
                countryCode: data.teamACountry,
                players: teamAPlayers
            },
            teamB: {
                name: data.teamB || countryB!.name,
                logoUrl: teamBLogoUrl,
                logoPath: teamBLogoPath,
                countryCode: data.teamBCountry,
                players: teamBPlayers
            }
        };

        const result = await updateMatch(match.id, payload);
        
        if (result.error) {
            toast({ variant: "destructive", title: "Error", description: result.error });
        } else {
            toast({ title: "Match Updated", description: `The match has been updated.` });
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
    const { fields, append, remove, update } = useFieldArray({ control: form.control, name: fieldName });
    const currentPlayers = useWatch({ control: form.control, name: fieldName }) || [];
    const [open, setOpen] = React.useState(false);
    const [savingPlayer, setSavingPlayer] = React.useState<number | null>(null);

     const handleSavePlayer = async (index: number) => {
        setSavingPlayer(index);
        const player = form.getValues(`${fieldName}.${index}`);
        if (!player.name) {
            toast({ variant: 'destructive', title: 'Error', description: 'Player name cannot be empty.' });
            setSavingPlayer(null);
            return;
        }
        if (!player.playerImageFile) {
            toast({ variant: 'destructive', title: 'Error', description: 'Player image is required.' });
            setSavingPlayer(null);
            return;
        }

        try {
            const { downloadUrl, storagePath } = await uploadFile(player.playerImageFile, 'players');
            const result = await createPlayer({
                name: player.name,
                sport: selectedSport,
                imageUrl: downloadUrl,
                imagePath: storagePath,
            });

            if (result.error) {
                toast({ variant: "destructive", title: "Error", description: result.error });
            } else {
                toast({ title: "Player Saved", description: `${player.name} has been saved to the database.` });
                const newPlayer = { id: result.id!, ...result.playerData! };
                
                // Update the form state for this player
                update(index, {
                    name: newPlayer.name,
                    playerImageUrl: newPlayer.imageUrl,
                    imagePath: newPlayer.imagePath,
                    bettingEnabled: true,
                    playerImageFile: undefined, // Clear the file
                });
                
                // Add to available players list
                setAvailablePlayers(prev => [...prev, newPlayer as Player]);
            }

        } catch (e: any) {
            toast({ variant: "destructive", title: "Operation Failed", description: e.message });
        } finally {
            setSavingPlayer(null);
        }
    }
    
    const unselectedPlayers = availablePlayers.filter(p => !currentPlayers.some(cp => cp.name === p.name));
    
    return (
      <div className="space-y-4">
        <Separator />
        <FormLabel>Team {teamLetter} Players</FormLabel>
        
        {/* Render selected players */}
        <div className="space-y-2">
            {fields.map((field, index) => {
                 if (!field.playerImageUrl) return null;
                 return (
                    <div key={field.id} className="flex items-center gap-3 p-2 border rounded-md">
                        <Image src={field.playerImageUrl} alt="Player" width={40} height={40} className="rounded-full w-10 h-10 object-cover" />
                        <span className="font-medium flex-1 truncate">{field.name}</span>
                        <FormField
                            control={form.control}
                            name={`${fieldName}.${index}.bettingEnabled`}
                            render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="text-xs text-muted-foreground">
                                        Betting
                                    </FormLabel>
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                 )
            })}
        </div>

        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={isLoadingPlayers}
                >
                    {isLoadingPlayers ? "Loading players..." : "Select Existing Player"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search player..." />
                    <CommandList>
                        <CommandEmpty>No player found.</CommandEmpty>
                        <CommandGroup>
                            {unselectedPlayers.map((player) => (
                                <CommandItem
                                    key={player.name}
                                    value={player.name}
                                    onSelect={(currentValue) => {
                                        const selected = availablePlayers.find(p => p.name.toLowerCase() === currentValue.toLowerCase());
                                        if (selected) {
                                            append({ name: selected.name, playerImageUrl: selected.imageUrl, imagePath: selected.imagePath, bettingEnabled: true });
                                        }
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", "opacity-0")} />
                                     <div className="flex items-center gap-2">
                                        <Image src={player.imageUrl} alt={player.name} width={24} height={24} className="rounded-full h-6 w-6 object-cover" />
                                        <span>{player.name}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>

        {/* Button to add new player fields */}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', playerImageUrl: '', playerImageFile: undefined, bettingEnabled: true })}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Player Manually
        </Button>
        <FormMessage>{(form.formState.errors as any)[fieldName]?.message}</FormMessage>
        
        {/* Fields for manually adding new players */}
         <div className="space-y-4">
            {fields.map((field, index) => {
                // Only show inputs for players that don't have an existing image URL (i.e., new players)
                if (field.playerImageUrl) return null; 
                return (
                     <div key={field.id} className="flex flex-col gap-3 p-3 border rounded-md relative border-dashed">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <div className="flex items-start gap-3">
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
                        </div>
                        <Button type="button" size="sm" onClick={() => handleSavePlayer(index)} disabled={savingPlayer === index}>
                            <Save className="mr-2 h-4 w-4" />
                            {savingPlayer === index ? "Saving..." : "Save Player"}
                        </Button>
                    </div>
                )
            })}
        </div>
      </div>
    );
  }

  const QuestionManager = () => {
    const currentQuestions = useWatch({ control: form.control, name: "questions" }) || [];
    const sportSpecificQuestions = questionBank.filter(q => q.sport === selectedSport);
    const [open, setOpen] = React.useState(false);
    const [manualQuestionText, setManualQuestionText] = React.useState("");
  
    const handleSelect = (questionText: string) => {
      const isSelected = currentQuestions.some(cq => cq.question === questionText);
      if (isSelected) {
        removeQuestion(currentQuestions.findIndex(cq => cq.question === questionText));
      } else {
        appendQuestion({ question: questionText });
      }
    };

    const handleAddManual = () => {
        if (manualQuestionText.trim()) {
            appendQuestion({ question: manualQuestionText.trim() });
            setManualQuestionText("");
        }
    };
  
    return (
      <div className="space-y-4">
        {questionFields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
            <span className="flex-1 text-sm">{field.question}</span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(index)}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
  
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
              {isLoadingQuestions ? "Loading questions..." : "Select from Question Bank"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <ScrollArea className="h-72">
              <div className="p-2 space-y-1">
                {isLoadingQuestions ? (
                  <p className="text-sm text-center text-muted-foreground p-4">Loading...</p>
                ) : sportSpecificQuestions.length > 0 ? (
                  sportSpecificQuestions.map((q) => (
                    <Label
                      key={q.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted font-normal cursor-pointer"
                    >
                      <Checkbox
                        checked={currentQuestions.some(cq => cq.question === q.question)}
                        onCheckedChange={() => handleSelect(q.question)}
                      />
                      <span className="text-sm flex-1">{q.question}</span>
                    </Label>
                  ))
                ) : (
                  <p className="text-sm text-center text-muted-foreground p-4">No questions found for {selectedSport}.</p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="p-3 border rounded-md relative border-dashed space-y-2">
            <Label htmlFor="manual-question" className="text-xs">New Question Text</Label>
            <Textarea 
                id="manual-question"
                placeholder="Enter new question" 
                value={manualQuestionText}
                onChange={(e) => setManualQuestionText(e.target.value)}
            />
            <Button type="button" size="sm" onClick={handleAddManual}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Question
            </Button>
        </div>
  
        <FormMessage>{form.formState.errors.questions?.message}</FormMessage>
      </div>
    );
  };

  if (!isFormReady) {
    return <EditMatchFormSkeleton />;
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
                   <Select onValueChange={(value) => {
                        field.onChange(value);
                        replaceQuestions([]); // Clear questions when sport changes
                    }} defaultValue={field.value}>
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
                        initialFocus
                      />
                       <div className="p-2 border-t">
                         <Input 
                           type="time"
                           defaultValue={field.value ? format(field.value, 'HH:mm') : ''}
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
                                <FormLabel>Team A Logo</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                            {teamAPreview ? <Image src={teamAPreview} alt="Team A Logo" width={96} height={96} className="object-contain"/> : <UploadCloud className="h-8 w-8 text-muted-foreground" />}
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
                                <FormLabel>Team B Logo</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                           {teamBPreview ? <Image src={teamBPreview} alt="Team B Logo" width={96} height={96} className="object-contain"/> : <UploadCloud className="h-8 w-8 text-muted-foreground" />}
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
        
        <Card>
            <CardHeader>
                <CardTitle>Betting Questions</CardTitle>
                <CardDescription>Select questions for this match from the bank, or add new ones manually.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <QuestionManager />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Dummy Winners (Optional)</CardTitle>
                <CardDescription>If no real user wins, these dummy users will be shown as the winners on the summary page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {dummyWinnerFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-md relative">
                        <FormField
                            control={form.control}
                            name={`dummyWinners.${index}.userId`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                <FormLabel>Dummy User</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDummyUsers}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingDummyUsers ? "Loading..." : "Select a dummy user"} />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availableDummyUsers.map(user => (
                                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`dummyWinners.${index}.amount`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>Dummy Win Amount (INR)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 500" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeDummyWinner(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendDummyWinner({ userId: '', amount: 0 })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Another Dummy Winner
                </Button>
            </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  )
}
