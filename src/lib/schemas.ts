
import { z } from "zod";
import { sports } from "@/lib/types";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

// Schema for adding/editing a match
export const matchSchema = z.object({
  sport: z.enum(sports, { required_error: "Please select a sport." }),
  teamA: z.string().optional(),
  teamB: z.string().optional(),
  teamACountry: z.string({ required_error: "Country for Team A is required." }).min(1, { message: "Country for Team A is required."}),
  teamBCountry: z.string({ required_error: "Country for Team B is required." }).min(1, { message: "Country for Team B is required."}),
  startTime: z.date({ required_error: "A start date and time is required." }),
  
  // New fields for file upload
  teamALogoFile: z.any()
    .optional()
    .refine((file) => !file || (file instanceof File && file.size <= MAX_LOGO_SIZE), `Max logo size is 2MB.`)
    .refine((file) => !file || (file instanceof File && ACCEPTED_LOGO_TYPES.includes(file.type)), ".jpg, .jpeg, .png, .webp, and .svg files are accepted."),
  teamBLogoFile: z.any()
    .optional()
    .refine((file) => !file || (file instanceof File && file.size <= MAX_LOGO_SIZE), `Max logo size is 2MB.`)
    .refine((file) => !file || (file instanceof File && ACCEPTED_LOGO_TYPES.includes(file.type)), ".jpg, .jpeg, .png, .webp, and .svg files are accepted."),
  
  teamALogoDataUri: z.string().optional(),
  teamBLogoDataUri: z.string().optional(),
});

export type MatchFormValues = z.infer<typeof matchSchema>;


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

// Schema for referral settings (Admin)
export const referralSettingsSchema = z.object({
  referrerBonus: z.coerce.number().min(0, "Bonus must be a positive number."),
  referredUserBonus: z.coerce.number().min(0, "Bonus must be a positive number."),
  isEnabled: z.boolean(),
});

export type ReferralSettingsFormValues = z.infer<typeof referralSettingsSchema>;


// Schema for content management (Admin)
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_BANNER_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_VIDEO_TYPES = ["video/mp4"];

export const contentManagementSchema = z.object({
  youtubeUrl: z.string().url({ message: "Please enter a valid YouTube URL." }).optional().or(z.literal('')),
  bannerImage: z.any()
    .optional()
    .refine((file) => !file || (file instanceof File && file.size <= MAX_BANNER_SIZE), `Max banner size is 5MB.`)
    .refine((file) => !file || (file instanceof File && ACCEPTED_BANNER_TYPES.includes(file.type)), ".jpg, .jpeg, .png and .webp files are accepted."),
  bannerImageDataUri: z.string().optional(),
  bannerImageUrl: z.string().url().optional().or(z.literal('')),
  smallVideo: z.any()
    .optional()
    .refine((file) => !file || (file instanceof File && file.size <= MAX_VIDEO_SIZE), `Max video size is 10MB.`)
    .refine((file) => !file || (file instanceof File && ACCEPTED_VIDEO_TYPES.includes(file.type)), "Only .mp4 videos are accepted."),
  smallVideoDataUri: z.string().optional(),
  smallVideoUrl: z.string().url().optional().or(z.literal('')),
});

export type ContentManagementFormValues = z.infer<typeof contentManagementSchema>;
