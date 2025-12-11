

export const sports = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"] as const;
export type Sport = typeof sports[number];

export type MatchStatus = "Upcoming" | "Live" | "Finished" | "Cancelled";

export type UserRole = 'admin' | 'sub-admin' | 'user';

export type UserPermissions = {
    canManageDashboard: boolean;
    canManageControlPanel: boolean;
    canManageUsers: boolean;
    canManageMatches: boolean;
    canManagePlayers: boolean;
    canManageDummyUsers: boolean;
    canManageResults: boolean;
    canManageDeposits: boolean;
    canManageWithdrawals: boolean;
    canViewFinancials: boolean;
    canManageReferrals: boolean;
    canManageBettingSettings: boolean;
    canManageBankDetails: boolean;
    canManageContent: boolean;
    canManageDataManagement: boolean;
    canManageSupport: boolean;
    canManagePermissions: boolean;
};


export type Player = {
  id?: string; // Player ID from the 'players' collection
  name: string;
  imageUrl: string;
  imagePath?: string;
  sport?: Sport;
  bettingEnabled?: boolean; // New field
};

export type DummyUser = {
  id: string;
  name: string;
  sport: Sport;
};

export type Team = {
  name: string;
  logoUrl: string;
  logoPath?: string;
  countryCode?: string;
  players?: Player[];
  bettingEnabled?: boolean;
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
  teamABettingEnabled?: boolean;
  teamBBettingEnabled?: boolean;
  dummyWinners?: { userId: string; amount: number }[];
  bettingSettings?: BettingSettings; // Snapshot of settings at match creation
  isFavorite?: boolean;
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
  timestamp: string | { toDate: () => Date }; // Allow for Firestore Timestamp
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
  role: UserRole;
  bankAccount?: UserBankAccount;
  referredBy?: string; // UID of the referrer
  isFirstBetPlaced?: boolean; // Has the user placed their first bet
  referralBonusAwarded?: boolean; // Has this user received their signup bonus
  permissions?: Partial<UserPermissions>;
  totalReferrals?: number; // New field for referral count
  totalWagered: number;
  totalWinnings: number;
  totalDeposits: number;
  totalWithdrawals: number;
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
  createdAt: string | { toDate: () => Date }; // Allow for Firestore Timestamp
  updatedAt: string | { toDate: () => Date };
};

export type WithdrawalRequest = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'Processing' | 'Approved' | 'Rejected';
  createdAt: string | { toDate: () => Date }; // Allow for Firestore Timestamp
  updatedAt: string | { toDate: () => Date };
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
  sport?: Sport;
  order: number;
  createdAt: string;
  status: 'active' | 'closed' | 'settled';
  result: { teamA: string, teamB: string } | null;
  playerResult?: { teamA: string, teamB: string } | null;
};

export type Transaction = {
    id: string;
    userId: string;
    type: 'referral_bonus' | 'deposit_commission';
    amount: number; // positive for credit
    description: string;
    timestamp: string | { toDate: () => Date }; // Allow for Firestore Timestamp
};

export type ReferralSettings = {
    referrerBonus: number;
    referredUserBonus: number;
    isEnabled: boolean;
    minBetAmountForBonus: number; // New field
    depositCommissionPercentage: number;
};

export type Referral = {
    id: string;
    referrerId: string;
    referredUserId: string;
    referredUserName: string;
    status: 'pending' | 'completed';
    potentialBonus: number;
    createdAt: string | { toDate: () => Date }; // Allow for Firestore Timestamp
    completedAt?: string;
};

export type AppSettings = {
  whatsappNumber: string;
};

export type Banner = {
    id?: string;
    imageUrl: string;
    imagePath: string;
};

export type ContentSettings = {
    banners: Banner[];
    youtubeUrl: string;
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

// Specific structure for Cricket bet options
export type CricketBetOptions = {
    general: BetOption[];
    oneSided: BetOption[];
    player: BetOption[];
};

// Overloaded settings type
export type BettingSettings = {
    betOptions: {
        Cricket: CricketBetOptions;
        Football: BetOption[];
        Tennis: BetOption[];
        "Table Tennis": BetOption[];
        Badminton: BetOption[];
    }
};
