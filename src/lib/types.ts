

export const sports = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"] as const;
export type Sport = typeof sports[number];

export type MatchStatus = "Upcoming" | "Live" | "Finished";

export type Team = {
  name: string;
  logoUrl: string;
  countryCode?: string;
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
};

export type Bet = {
  id:string;
  userId: string;
  matchId: string;
  matchDescription: string;
  questionId: string;
  questionText: string;
  predictionA: string;
  predictionB: string;
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
  userName: string;
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

export type QnaOption = {
  text: string;
  odds: number;
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
  options: QnaOption[];
  createdAt: string;
  status: 'active' | 'closed' | 'settled';
  result: string | null;
};
