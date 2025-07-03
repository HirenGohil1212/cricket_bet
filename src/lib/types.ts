
export const sports = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"] as const;
export type Sport = typeof sports[number];

export type MatchStatus = "Upcoming" | "Live" | "Finished";

export type Player = {
  name: string;
  imageUrl: string;
};

export type Team = {
  name: string;
  logoUrl: string;
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
  status: "Won" | "Lost" | "Pending";
  timestamp: string; // Changed from Date to string
  potentialWin: number;
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
  qrCodeUrl: string;
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
  screenshotUrl: string;
  status: 'Pending' | 'Completed' | 'Failed';
  createdAt: string;
  updatedAt: string;
};

export type WithdrawalRequest = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'Pending' | 'Completed' | 'Failed';
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

export type ContentSettings = {
    youtubeUrl: string;
    bannerImageUrl: string;
    smallVideoUrl: string;
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
    betOptions: BetOption[];
};
