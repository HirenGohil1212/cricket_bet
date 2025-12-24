
import { z } from "zod";
import { sports, type Sport } from "@/lib/types";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

const MAX_PLAYER_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB
const ACCEPTED_PLAYER_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const playerSchema = z.object({
  name: z.string().min(2, "Player name must be at least 2 characters."),
  playerImageFile: z.instanceof(File).optional(),
  playerImageUrl: z.string().optional(),
  imagePath: z.string().optional(),
  bettingEnabled: z.boolean().default(true),
});

// Schema for the client-side form for adding/editing a match
export const matchSchema = z.object({
  sport: z.enum(sports, { required_error: "Please select a sport." }),
  teamA: z.string().optional(),
  teamB: z.string().optional(),
  teamACountry: z.string().optional(),
  teamBCountry: z.string().optional(),
  startTime: z.date({ required_error: "A start date and time is required." }),
  
  teamALogoFile: z.any()
    .optional()
    .refine((file) => !file || (file instanceof File && file.size <= MAX_LOGO_SIZE), `Max logo size is 2MB.`)
    .refine((file) => !file || (file instanceof File && ACCEPTED_LOGO_TYPES.includes(file.type)), ".jpg, .jpeg, .png, .webp, and .svg files are accepted."),
  teamBLogoFile: z.any()
    .optional()
    .refine((file) => !file || (file instanceof File && file.size <= MAX_LOGO_SIZE), `Max logo size is 2MB.`)
    .refine((file) => !file || (file instanceof File && ACCEPTED_LOGO_TYPES.includes(file.type)), ".jpg, .jpeg, .png, .webp, and .svg files are accepted."),
  
  teamAPlayers: z.array(playerSchema).optional(),
  teamBPlayers: z.array(playerSchema).optional(),

  isSpecialMatch: z.boolean().default(false),
  allowOneSidedBets: z.boolean().default(false),

  questions: z.array(z.object({
    question: z.string().min(1, "Question cannot be empty.")
  })).min(1, "At least one question is required."),

  dummyWinners: z.array(z.object({
    userId: z.string().min(1, "Please select a dummy user."),
    amount: z.coerce.number().min(1, "Amount must be at least 1."),
  })).optional(),
}).superRefine((data, ctx) => {
    if (!data.teamA && !data.teamACountry) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["teamACountry"],
            message: "Either Team A name or country is required.",
        });
    }
    if (!data.teamB && !data.teamBCountry) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["teamBCountry"],
            message: "Either Team B name or country is required.",
        });
    }
});

export type MatchFormValues = z.infer<typeof matchSchema>;


// Schema for Bank Details (Admin)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const bankAccountSchema = z.object({
  id: z.string(),
  upiId: z.string().min(1, "UPI ID is required."),
  accountHolderName: z.string().min(2, "Account holder name is required."),
  accountNumber: z.string().min(1, "Account number is required."),
  ifscCode: z.string().min(1, "IFSC code is required."),
  qrCodeFile: z.any()
    .optional()
    .refine((file) => !file || (file instanceof File && file.size <= MAX_FILE_SIZE), `Max file size is 5MB.`)
    .refine((file) => !file || (file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type)), ".jpg, .jpeg, .png and .webp files are accepted."),
  qrCodeUrl: z.string().url().optional().or(z.literal('')),
  qrCodePath: z.string().optional(),
});

export const bankDetailsFormSchema = z.object({
  accounts: z.array(bankAccountSchema).max(5, "You can add a maximum of 5 accounts.").min(1, "Please add at least one account."),
});

export type BankAccount = z.infer<typeof bankAccountSchema>;
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
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_SCREENSHOT_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const depositRequestSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum deposit amount is INR 100."),
  utrNumber: z.string().min(12, "UTR must be 12 digits.").max(12, "UTR must be 12 digits."),
  screenshotFile: z.any()
    .refine((file) => file instanceof File, "Payment screenshot is required.")
    .refine((file) => !(file instanceof File) || file.size <= MAX_SCREENSHOT_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => !(file instanceof File) || ACCEPTED_SCREENSHOT_TYPES.includes(file.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
  selectedAccountId: z.string({ required_error: "Please select a payment method." }).min(1, "Please select a payment method."),
});

export type DepositRequestFormValues = z.infer<typeof depositRequestSchema>;


// Schema for withdrawal requests
export const withdrawalRequestSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum withdrawal amount is INR 100."),
});

export type WithdrawalRequestFormValues = z.infer<typeof withdrawalRequestSchema>;


// Schema for Q&A Template (Admin Form)
export const qnaItemSchema = z.object({
  question: z.string().min(1, "Question cannot be empty."),
});

export const qnaFormSchema = z.object({
  questions: z.array(qnaItemSchema).min(1, "You must add at least one question."),
});
export type QnAFormValues = z.infer<typeof qnaFormSchema>;

// Schema for referral settings (Admin)
export const referralSettingsSchema = z.object({
  isEnabled: z.boolean(),
  referrerBonus: z.coerce.number().min(0, "Bonus must be a positive number."),
  referredUserBonus: z.coerce.number().min(0, "Bonus must be a positive number."),
  minBetAmountForBonus: z.coerce.number().min(0, "Minimum bet amount must be a positive number."),
  depositCommissionPercentage: z.coerce.number().min(0, "Commission must be a positive number.").max(100, "Commission cannot exceed 100%."),
});

export type ReferralSettingsFormValues = z.infer<typeof referralSettingsSchema>;


// Schema for content management (Admin)
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_BANNER_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_VIDEO_TYPES = ["video/mp4"];

export const contentManagementSchema = z.object({
  youtubeUrl: z.string().url({ message: "Please enter a valid YouTube URL." }).optional().or(z.literal('')),
  smallVideoFile: z.any()
    .optional()
    .refine((file) => !file || (file instanceof File && file.size <= MAX_VIDEO_SIZE), `Max video size is 10MB.`)
    .refine((file) => !file || (file instanceof File && ACCEPTED_VIDEO_TYPES.includes(file.type)), "Only .mp4 videos are accepted."),
});

export type ContentManagementFormValues = z.infer<typeof contentManagementSchema>;


// Schema for Betting Settings (Admin)
export const betOptionSchema = z.object({
  amount: z.coerce.number().min(1, "Bet amount must be at least 1 INR."),
  payout: z.coerce.number().min(1, "Payout amount must be at least 1 INR."),
});

const sportBetOptionsSchema = z.array(betOptionSchema)
  .min(1, "At least one bet option is required.")
  .max(5, "You can add a maximum of 5 bet options.");

const cricketBetOptionsSchema = z.object({
    general: sportBetOptionsSchema,
    oneSided: sportBetOptionsSchema,
    player: sportBetOptionsSchema,
});

export const bettingSettingsSchema = z.object({
  betOptions: z.object({
    Cricket: cricketBetOptionsSchema,
    Football: sportBetOptionsSchema,
    Tennis: sportBetOptionsSchema,
    "Table Tennis": sportBetOptionsSchema,
    Badminton: sportBetOptionsSchema,
  })
});

export type BettingSettingsFormValues = z.infer<typeof bettingSettingsSchema>;


// Schema for App Settings (Admin)
export const appSettingsSchema = z.object({
  whatsappNumber: z.string().min(10, "Please enter a valid phone number with country code.").optional().or(z.literal('')),
  depositBonusPercentage: z.coerce.number().min(0, "Percentage must be 0 or more.").max(100, "Percentage cannot be more than 100.").optional(),
});
export type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;
