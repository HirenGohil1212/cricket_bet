
'use server';

import { collection, getDocs, query, where, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DailyFinancialActivity } from '@/lib/types';
import { subDays, startOfDay, format } from 'date-fns';

// Gets all-time financial summary from the dedicated summary document.
export async function getFinancialSummary() {
    try {
        const summaryRef = doc(db, 'statistics', 'financialSummary');
        const usersRef = collection(db, 'users');
        const transactionsRef = collection(db, 'transactions');
        
        // Use Promise.all to fetch data concurrently
        const [summarySnap, usersSnap, referralBonusesSnap] = await Promise.all([
            getDoc(summaryRef),
            getDocs(query(usersRef)),
            getDocs(query(transactionsRef, where('type', '==', 'referral_bonus')))
        ]);
        
        // Initialize summary data
        let summaryData = {
            totalDeposits: 0,
            totalWithdrawals: 0,
            totalWagered: 0,
            totalPayouts: 0,
        };
        
        if (summarySnap.exists()) {
            summaryData = summarySnap.data() as typeof summaryData;
        } else {
            // If summary doc doesn't exist, create it.
            await setDoc(summaryRef, summaryData);
        }

        // Calculate total user wallet funds
        const totalUserWalletFunds = usersSnap.docs.reduce(
            (sum, doc) => sum + (doc.data().walletBalance || 0),
            0
        );

        // Calculate total referral bonuses
        const totalReferralBonuses = referralBonusesSnap.docs.reduce(
            (sum, doc) => sum + (doc.data().amount || 0),
            0
        );
        
        const betIncome = summaryData.totalWagered;
        const grossRevenue = betIncome - summaryData.totalPayouts;
        const finalProfit = grossRevenue - totalReferralBonuses;
        
        return {
            totalDeposits: summaryData.totalDeposits,
            totalWithdrawals: summaryData.totalWithdrawals,
            totalUserWalletFunds,
            betIncome,
            totalReferralBonuses,
            finalProfit,
            error: null,
        };
    } catch (error) {
        console.error("Error fetching financial summary:", error);
        return { 
            totalDeposits: 0,
            totalWithdrawals: 0,
            totalUserWalletFunds: 0,
            betIncome: 0,
            totalReferralBonuses: 0,
            finalProfit: 0,
            error: 'Failed to fetch financial summary.' 
        };
    }
}


export async function getDailyFinancialActivity(days: number = 30): Promise<DailyFinancialActivity[]> {
    const activityMap = new Map<string, { deposits: number; withdrawals: number; wagered: number; payouts: number }>();
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);

    // Initialize map for the last `days` days
    for (let i = 0; i < days; i++) {
        const date = format(subDays(endDate, i), 'yyyy-MM-dd');
        activityMap.set(date, { deposits: 0, withdrawals: 0, wagered: 0, payouts: 0 });
    }

    try {
        const startTimestamp = Timestamp.fromDate(startOfDay(startDate));

        // Deposits - Query by date range only, then filter by status in code to avoid composite index
        const depositsQuery = query(collection(db, 'deposits'), where('updatedAt', '>=', startTimestamp));
        const depositsSnapshot = await getDocs(depositsQuery);
        depositsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'Approved') {
                const date = format((data.updatedAt as Timestamp).toDate(), 'yyyy-MM-dd');
                if (activityMap.has(date)) {
                    activityMap.get(date)!.deposits += data.amount;
                }
            }
        });
        
        // Withdrawals - Query by date range only, then filter by status in code to avoid composite index
        const withdrawalsQuery = query(collection(db, 'withdrawals'), where('updatedAt', '>=', startTimestamp));
        const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
        withdrawalsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'Approved') {
                const date = format((data.updatedAt as Timestamp).toDate(), 'yyyy-MM-dd');
                if (activityMap.has(date)) {
                    activityMap.get(date)!.withdrawals += data.amount;
                }
            }
        });

        // Bets & Payouts
        const betsQuery = query(collection(db, 'bets'), where('timestamp', '>=', startTimestamp));
        const betsSnapshot = await getDocs(betsQuery);
        betsSnapshot.forEach(doc => {
            const data = doc.data();
            const date = format((data.timestamp as Timestamp).toDate(), 'yyyy-MM-dd');
            if (activityMap.has(date)) {
                activityMap.get(date)!.wagered += data.amount;
                if (data.status === 'Won') {
                    activityMap.get(date)!.payouts += data.potentialWin;
                }
            }
        });
        
        const result: DailyFinancialActivity[] = Array.from(activityMap.entries()).map(([date, values]) => ({
            date,
            revenue: values.wagered - values.payouts,
            deposits: values.deposits,
            withdrawals: values.withdrawals,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return result;

    } catch (error) {
        console.error("Error fetching daily financial activity:", error);
        return [];
    }
}
