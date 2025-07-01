import { z } from "zod";
import { sports } from "@/lib/types";

// Schema for adding/editing a match
export const matchSchema = z.object({
  sport: z.enum(sports, { required_error: "Please select a sport." }),
  teamA: z.string().optional(),
  teamB: z.string().optional(),
  teamACountry: z.string({ required_error: "Country for Team A is required." }).min(1, { message: "Country for Team A is required."}),
  teamBCountry: z.string({ required_error: "Country for Team B is required." }).min(1, { message: "Country for Team B is required."}),
  teamALogo: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  teamBLogo: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  startTime: z.date({ required_error: "A start date and time is required." }),
});

export type MatchFormValues = z.infer<typeof matchSchema>;

// Schema for placing a bet
export const betSchema = z.object({
  matchId: z.string(),
  team: z.string({
    required_error: "You need to select a team.",
  }),
  amount: z.enum(['9', '19', '29'], {
    required_error: "You need to select a bet amount.",
  }),
});

export type BetFormValues = z.infer<typeof betSchema>;
