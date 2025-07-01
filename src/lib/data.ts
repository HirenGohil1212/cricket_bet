import type { Match, Bet, Sport } from './types';

const now = new Date();

const sports: Sport[] = ["Cricket", "Football", "Tennis", "Table Tennis", "Badminton"];

const teams: { [key in Sport]: string[] } = {
    Cricket: ["Warriors", "Titans", "Lions", "Eagles", "Sharks", "Cobras"],
    Football: ["United", "Rovers", "City", "Wanderers", "Albion", "Athletic"],
    Tennis: ["Ace", "Slice", "Volley", "Smash", "Rally", "Drop"],
    "Table Tennis": ["Ping", "Pong", "Spin", "Loop", "Flick", "Chop"],
    Badminton: ["Smashers", "Net-Play", "Drop-Shot", "Clears", "Drives", "Lifts"],
};

const getRandomTeam = (sport: Sport, exclude: string[] = []): string => {
    const availableTeams = teams[sport].filter(t => !exclude.includes(t));
    return availableTeams[Math.floor(Math.random() * availableTeams.length)];
}

let matchIdCounter = 0;

export const mockMatches: Match[] = Array.from({ length: 50 }).map((_, i) => {
    const sport = sports[i % sports.length];
    const teamAName = getRandomTeam(sport);
    const teamBName = getRandomTeam(sport, [teamAName]);
    const statusIndex = Math.random();
    let status: "Upcoming" | "Live" | "Finished";
    let startTime: Date;
    let score: string | undefined;
    let winner: string | undefined;

    if (statusIndex < 0.5) { // 50% Upcoming
        status = "Upcoming";
        startTime = new Date(now.getTime() + (i + 1) * 30 * 60 * 1000); // in the future
    } else if (statusIndex < 0.7) { // 20% Live
        status = "Live";
        startTime = new Date(now.getTime() - 30 * 60 * 1000); // in the past
        score = `${Math.floor(Math.random() * 3)}-${Math.floor(Math.random() * 3)}`;
    } else { // 30% Finished
        status = "Finished";
        startTime = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000); // in the past
        const scoreA = Math.floor(Math.random() * 5);
        const scoreB = Math.floor(Math.random() * 5);
        score = `${scoreA}-${scoreB}`;
        winner = scoreA > scoreB ? teamAName : teamBName;
    }

    return {
        id: `match-${matchIdCounter++}`,
        sport,
        teamA: { name: teamAName, logoUrl: `https://placehold.co/40x40.png` },
        teamB: { name: teamBName, logoUrl: `https://placehold.co/40x40.png` },
        status,
        startTime,
        score,
        winner,
    };
});


export const mockBets: Bet[] = [
    {
        id: 'bet-1',
        matchId: 'match-10',
        matchDescription: 'Warriors vs. Titans',
        prediction: 'Warriors',
        amount: 50,
        status: 'Won',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        potentialWin: 90,
    },
    {
        id: 'bet-2',
        matchId: 'match-12',
        matchDescription: 'United vs. Rovers',
        prediction: 'Rovers',
        amount: 100,
        status: 'Lost',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        potentialWin: 150,
    },
    {
        id: 'bet-3',
        matchId: 'match-1',
        matchDescription: 'Ace vs. Slice',
        prediction: 'Ace',
        amount: 20,
        status: 'Pending',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        potentialWin: 35,
    }
];
