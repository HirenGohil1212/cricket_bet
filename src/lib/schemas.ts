
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

// Schema for Bank Details (Admin)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const bankAccountSchema = z.object({
  id: z.string().optional(),
  upiId: z.string().min(1, "UPI ID is required."),
  accountHolderName: z.string().min(2, "Account holder name is required."),
  accountNumber: z.string().min(1, "Account number is required."),
  ifscCode: z.string().min(1, "IFSC code is required."),
  qrCode: z.any()
    .optional()
    .refine((file) => !file || (file instanceof File && file.size <= MAX_FILE_SIZE), `Max file size is 5MB.`)
    .refine((file) => !file || (file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type)), ".jpg, .jpeg, .png and .webp files are accepted."),
  qrCodeUrl: z.string().url().optional().or(z.literal('')),
  qrCodeDataUri: z.string().optional(),
});

export const bankDetailsFormSchema = z.object({
  accounts: z.array(bankAccountSchema).max(5, "You can add a maximum of 5 accounts.").min(1, "Please add at least one account."),
});

export type BankDetailsFormValues = z.infer<typeof bankDetailsFormSchema>;


// Schema for User's Bank Account
export const userBankAccountSchema = z.object({
  accountHolderName: z.string().min(2, "Account holder name is required."),
  accountNumber: z.string().min(1, "Account number is required."),
  ifscCode: z.string().min(1, "IFSC code is required."),
  upiId: z.string().min(3, "A valid UPI ID is required.").optional().or(z.literal('')),
});

export type UserBankAccountFormValues = z.infer<typeof userBankAccountSchema>;


// Schema for deposit requests
export const depositRequestSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum deposit amount is INR 100."),
  screenshotDataUri: z.string().optional(),
});

export type DepositRequestFormValues = z.infer<typeof depositRequestSchema>;


// Schema for withdrawal requests
export const withdrawalRequestSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum withdrawal amount is INR 100."),
});

export type WithdrawalRequestFormValues = z.infer<typeof withdrawalRequestSchema>;


// Schema for Q&A Template (Admin Form)
export const qnaItemSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters."),
});

export const qnaFormSchema = z.object({
  questions: z.array(qnaItemSchema).min(1, "You must add at least one question."),
});
export type QnAFormValues = z.infer<typeof qnaFormSchema>;
