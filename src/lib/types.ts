
export const sports = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"] as const;
export type Sport = typeof sports[number];

export type MatchStatus = "Upcoming" | "Live" | "Finished";

export type Team = {
  name: string;
  logoUrl: string;
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
  id: string;
  userId: string;
  matchId: string;
  matchDescription: string;
  prediction: string;
  amount: number;
  status: "Won" | "Lost" | "Pending";
  timestamp: string; // Changed from Date to string
  potentialWin: number;
};

export type UserProfile = {
  uid: string;
  name: string;
  phoneNumber: string;
  createdAt: string; // Changed from Date to string
  walletBalance: number;
  referralCode: string;
  role: 'admin' | 'user';
};
