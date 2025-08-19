

export const sports = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"] as const;
export type Sport = typeof sports[number];

export type MatchStatus = "Upcoming" | "Live" | "Finished" | "Cancelled";

export type Player = {
  id?: string; // Player ID from the 'players' collection
  name: string;
  imageUrl: string;
  sport?: Sport;
};

export type Team = {
  name: string;
  logoUrl: string;
  logoPath?: string;
  countryCode?: string;
  players?: Player[];
};

export type Match = {
  id: string;
  sport: Sport;
  teamA: Team;
  teamB: Team;
  status: MatchStatus;
  startTime: string; // Changed from Date to string
  score?: string;
  winner?: string;
  winners?: Winner[];
  isSpecialMatch?: boolean;
  allowOneSidedBets?: boolean;
};

export type Prediction = {
  questionId: string;
  questionText: string;
  predictedAnswer?: { teamA: string, teamB: string };
};

export type Bet = {
  id:string;
  userId: string;
  matchId: string;
  matchDescription: string;
  predictions: Prediction[];
  amount: number;
  status: "Won" | "Lost" | "Pending" | "Refunded";
  timestamp: string; // Changed from Date to string
  potentialWin: number;
  betType?: 'qna' | 'player';
};

export type UserBankAccount = {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
};

export type UserProfile = {
  uid: string;
  name: string;
  phoneNumber: string;
  createdAt: string; // Changed from Date to string
  walletBalance: number;
  referralCode: string;
  role: 'admin' | 'user';
  bankAccount?: UserBankAccount;
  referredBy?: string; // UID of the referrer
  isFirstBetPlaced?: boolean; // Has the user placed their first bet
  referralBonusAwarded?: boolean; // Has this user received their signup bonus
};

export type BankAccount = {
  id?: string;
  qrCodeUrl: string;
  qrCodePath?: string; // Add storage path for the QR code
  upiId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
};

export type DepositRequest = {
  id: string;
  userId: string;
  userName:string;
  amount: number;
  utrNumber: string;
  screenshotUrl: string;
  screenshotPath?: string;
  status: 'Processing' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
};

export type WithdrawalRequest = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'Processing' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
  userBankAccount: UserBankAccount;
};

// Represents a question item in the template creation form
export type QnaFormItem = {
  question: string;
};

// Represents the full schema for the template creation form
export type QnaFormValues = {
  questions: QnaFormItem[];
};

export type Question = {
  id: string;
  question: string;
  order: number;
  createdAt: string;
  status: 'active' | 'closed' | 'settled';
  result: { teamA: string, teamB: string } | null;
  playerResult?: { teamA: string, teamB: string } | null;
};

export type Transaction = {
    id: string;
    userId: string;
    type: 'referral_bonus';
    amount: number; // positive for credit
    description: string;
    timestamp: string;
};

export type ReferralSettings = {
    referrerBonus: number;
    referredUserBonus: number;
    isEnabled: boolean;
};

export type AppSettings = {
  whatsappNumber: string;
};

export type ContentSettings = {
    youtubeUrl: string;
    bannerImageUrl: string;
    bannerImagePath?: string;
    smallVideoUrl: string;
    smallVideoPath?: string;
};

export type DailyFinancialActivity = {
    date: string;
    revenue: number;
    deposits: number;
    withdrawals: number;
}

export type Winner = {
    userId: string;
    name: string;
    payoutAmount: number;
};

export type BetOption = {
    amount: number;
    payout: number;
};

export type BettingSettings = {
    betOptions: Record<Sport, BetOption[]>;
};
