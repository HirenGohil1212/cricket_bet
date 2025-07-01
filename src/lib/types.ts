export type Sport = "Cricket" | "Football" | "Tennis" | "Table Tennis" | "Badminton";

export const sports: Sport[] = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"];

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
  startTime: Date;
  score?: string;
  winner?: string;
};

export type Bet = {
  id: string;
  matchId: string;
  matchDescription: string;
  prediction: string;
  amount: number;
  status: "Won" | "Lost" | "Pending";
  timestamp: Date;
  potentialWin: number;
};

export type UserProfile = {
  uid: string;
  name: string;
  phoneNumber: string;
  createdAt: Date;
  walletBalance: number;
  referralCode: string;
  role: 'admin' | 'user';
};
