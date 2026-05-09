
'use server';

import {
    collection,
    doc,
    writeBatch,
    query,
    getDocs,
    Timestamp,
    where,
    runTransaction,
    updateDoc,
    getDoc,
    orderBy,
    documentId,
    addDoc,
    deleteDoc,
    increment,
    setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Question, Sport, Winner, Bet } from '@/lib/types';


// --- Question Bank Actions ---

export async function createQuestionInBank(questionText: string, sport: Sport, type: 'qna' | 'player' = 'qna') {
    if (!questionText || !questionText.trim()) {
        return { error: 'Question text cannot be empty.' };
    }
    try {
        const docRef = await addDoc(collection(db, 'questionBank'), {
            question: questionText.trim(),
            sport: sport,
            type: type,
            createdAt: Timestamp.now(),
        });

        const newQuestion: Question = {
            id: docRef.id,
            question: questionText.trim(),
            sport: sport,
            type: type,
            createdAt: new Date().toISOString(),
            order: 0, 
            status: 'active',
            result: null,
            teamABettingEnabled: true,
            teamBBettingEnabled: true,
            multiplier: null,
        }
        revalidatePath('/admin/q-and-a');
        return { success: 'Question added successfully.', newQuestion };
    } catch (error) {
        console.error("Error creating question in bank: ", error);
        return { error: 'Failed to add question to the bank.' };
    }
}

export async function getQuestionsFromBank(): Promise<Question[]> {
    try {
        const q = query(collection(db, 'questionBank'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                type: data.type || 'qna',
                createdAt: (data.createdAt as Timestamp).toDate().toISOString()
            } as Question;
        });
    } catch (error) {
        console.error("Error fetching questions from bank: ", error);
        return [];
    }
}

export async function deleteQuestionFromBank(questionId: string) {
    if (!questionId) {
        return { error: 'Question ID is required.' };
    }
    try {
        await deleteDoc(doc(db, 'questionBank', questionId));
        revalidatePath('/admin/q-and-a');
        return { success: 'Question deleted successfully.' };
    } catch (error) {
        console.error("Error deleting question from bank: ", error);
        return { error: 'Failed to delete question.' };
    }
}


// --- Match-specific Question Actions ---


export async function getQuestionsForMatch(matchId: string): Promise<Question[]> {
    if (!matchId) return [];
    try {
        const questionsRef = collection(db, `matches/${matchId}/questions`);
        const q = query(questionsRef, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                question: data.question,
                type: data.type || 'qna',
                order: data.order,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                status: data.status,
                result: data.result || null,
                playerResult: data.playerResult || null,
                teamABettingEnabled: data.teamABettingEnabled ?? true,
                teamBBettingEnabled: data.teamBBettingEnabled ?? true,
                multiplier: data.multiplier || null,
            } as Question;
        });
    } catch (error) {
        console.error("Error fetching questions for match:", error);
        return [];
    }
}

export async function saveQuestionsForMatch(matchId: string, questions: { question: string; type?: 'qna' | 'player'; multiplier?: number }[]) {
     if (!matchId) {
        return { error: 'A match ID must be provided.' };
    }
    
    try {
        const batch = writeBatch(db);
        const questionsCollectionRef = collection(db, `matches/${matchId}/questions`);

        const existingQuestionsSnapshot = await getDocs(questionsCollectionRef);
        existingQuestionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        questions.forEach((q, index) => {
            const questionRef = doc(questionsCollectionRef);
            batch.set(questionRef, {
                question: q.question,
                type: q.type || 'qna',
                multiplier: q.multiplier || null,
                order: index,
                createdAt: Timestamp.now(),
                status: 'active',
                result: null,
                teamABettingEnabled: true,
                teamBBettingEnabled: true,
            });
        });

        await batch.commit();

        revalidatePath(`/admin/q-and-a`);
        return { success: 'Questions have been updated successfully!' };
    } catch (error: any) {
        console.error("Error updating questions: ", error);
        return { error: 'Failed to update questions.' };
    }
}

export async function saveSingleQuestionResults(
    matchId: string, 
    questionId: string,
    result?: { teamA: string, teamB: string },
    playerResult?: any
) {
    if (!matchId || !questionId) return { error: 'Missing IDs' };

    const questionRef = doc(db, `matches/${matchId}/questions`, questionId);
    const updateData: { result?: any; playerResult?: any } = {};
    
    if (result) updateData.result = result;
    if (playerResult) updateData.playerResult = playerResult;

    try {
        await updateDoc(questionRef, updateData);
        revalidatePath(`/admin/q-and-a`);
        return { success: 'Result saved.' };
    } catch (error: any) {
        console.error("Error saving single question result:", error);
        return { error: error.message || 'Failed to save.' };
    }
}

/**
 * ROBUST PARTIAL SETTLEMENT LOGIC
 * Allows publishing Team A or Team B results individually.
 * Suspends betting for the side that has a result.
 */
export async function settleSingleQuestion(
    matchId: string,
    questionId: string,
    type: 'qna' | 'player',
    result?: { teamA: string, teamB: string },
    playerResult?: any
) {
    if (!matchId || !questionId) return { error: 'Missing IDs' };

    const matchRef = doc(db, 'matches', matchId);
    const questionRef = doc(db, `matches/${matchId}/questions`, questionId);

    try {
        const [matchDoc, questionDoc] = await Promise.all([
            getDoc(matchRef),
            getDoc(questionRef)
        ]);

        if (!matchDoc.exists() || !questionDoc.exists()) return { error: 'Match or Question not found.' };
        
        const qData = questionDoc.data();
        if (qData.status === 'settled') return { error: 'Already fully settled.' };

        const matchData = matchDoc.data();
        const betsRef = collection(db, 'bets');
        const pendingBetsQuery = query(betsRef, where('matchId', '==', matchId), where('status', '==', 'Pending'));
        const pendingBetsSnapshot = await getDocs(pendingBetsQuery);

        let payouts = new Map<string, number>();
        let betUpdates: { ref: any, data: any }[] = [];

        // --- REFINED PARTIAL SETTLEMENT DETECTION ---
        // Ensure a side is only settled if a result value is actually provided.
        const hasTeamAVal = type === 'qna' 
            ? (!!result?.teamA && String(result.teamA).trim() !== '')
            : (!!playerResult?.teamA && Object.values(playerResult.teamA).some(val => !!val && String(val).trim() !== ''));

        const hasTeamBVal = type === 'qna' 
            ? (!!result?.teamB && String(result.teamB).trim() !== '')
            : (!!playerResult?.teamB && Object.values(playerResult.teamB).some(val => !!val && String(val).trim() !== ''));

        const settlingTeamA = hasTeamAVal && qData.teamABettingEnabled !== false;
        const settlingTeamB = hasTeamBVal && qData.teamBBettingEnabled !== false;

        if (!settlingTeamA && !settlingTeamB) {
            return { error: 'Please enter at least one team result to publish.' };
        }

        if (!pendingBetsSnapshot.empty) {
            for (const betDoc of pendingBetsSnapshot.docs) {
                const betData = betDoc.data() as Bet;
                const betRef = doc(db, 'bets', betDoc.id);
                const prediction = betData.predictions[0];
                if (!prediction) continue;

                let isMatchForThisQuestion = false;
                if (type === 'player') {
                    const [, qId] = prediction.questionId.split(':');
                    if (qId === questionId) isMatchForThisQuestion = true;
                } else {
                    if (prediction.questionId === questionId) isMatchForThisQuestion = true;
                }

                if (!isMatchForThisQuestion) continue;

                let isWinner = false;
                let isLoser = false;

                if (type === 'player') {
                    const [playerName] = prediction.questionId.split(':');
                    const teamSide = matchData.teamA.players?.some((p: any) => p.name === playerName) ? 'teamA' : 'teamB';
                    
                    const sideIsSettling = (teamSide === 'teamA' && settlingTeamA) || (teamSide === 'teamB' && settlingTeamB);
                    
                    if (sideIsSettling && playerResult) {
                        const correctVal = String(playerResult[teamSide]?.[playerName] || '').trim().toLowerCase();
                        const predictedVal = String(prediction.predictedAnswer?.[teamSide] || '').trim().toLowerCase();
                        if (correctVal === predictedVal) isWinner = true;
                        else isLoser = true;
                    }
                } else {
                    const predA = (prediction.predictedAnswer?.teamA || '').trim().toLowerCase();
                    const predB = (prediction.predictedAnswer?.teamB || '').trim().toLowerCase();
                    const corrA = (result?.teamA || '').trim().toLowerCase();
                    const corrB = (result?.teamB || '').trim().toLowerCase();

                    const sideA_active = !!predA;
                    const sideB_active = !!predB;

                    if (sideA_active && sideB_active) {
                        // BOTH SIDE BET
                        if (settlingTeamA && settlingTeamB) {
                            if (predA === corrA && predB === corrB) isWinner = true;
                            else isLoser = true;
                        } else if (settlingTeamA && predA !== corrA) {
                            isLoser = true; // Lost immediately on A
                        } else if (settlingTeamB && predB !== corrB) {
                            isLoser = true; // Lost immediately on B
                        }
                        // If correct on one side but other side not settled yet, it stays PENDING
                    } else if (sideA_active) {
                        // ONE SIDED A
                        if (settlingTeamA) {
                            if (predA === corrA) isWinner = true;
                            else isLoser = true;
                        }
                    } else if (sideB_active) {
                        // ONE SIDED B
                        if (settlingTeamB) {
                            if (predB === corrB) isWinner = true;
                            else isLoser = true;
                        }
                    }
                }

                if (isWinner) {
                    betUpdates.push({ ref: betRef, data: { status: 'Won' }});
                    payouts.set(betData.userId, (payouts.get(betData.userId) || 0) + betData.potentialWin);
                } else if (isLoser) {
                    betUpdates.push({ ref: betRef, data: { status: 'Lost' }});
                }
            }
        }

        const batch = writeBatch(db);
        betUpdates.forEach(u => batch.update(u.ref, u.data));

        // Update Question State
        const finalTeamABettingEnabled = settlingTeamA ? false : (qData.teamABettingEnabled ?? true);
        const finalTeamBBettingEnabled = settlingTeamB ? false : (qData.teamBBettingEnabled ?? true);
        const isFullySettled = !finalTeamABettingEnabled && !finalTeamBBettingEnabled;

        batch.update(questionRef, { 
            status: isFullySettled ? 'settled' : 'active',
            teamABettingEnabled: finalTeamABettingEnabled,
            teamBBettingEnabled: finalTeamBBettingEnabled,
            ...(type === 'qna' ? { result } : { playerResult }) 
        });

        for (const [uid, amt] of payouts.entries()) {
            if (amt > 0) {
                batch.update(doc(db, 'users', uid), {
                    walletBalance: increment(amt),
                    totalWinnings: increment(amt)
                });
            }
        }

        await batch.commit();

        // Robust match finalization check
        if (isFullySettled) {
            const questionsRef = collection(db, `matches/${matchId}/questions`);
            const activeQuestionsSnap = await getDocs(query(questionsRef, where('status', '==', 'active')));
            
            // If NO questions are currently active in the match, finish it.
            if (activeQuestionsSnap.empty) {
                await updateDoc(matchRef, { status: 'Finished' });
            }
        }

        revalidatePath('/admin/q-and-a');
        revalidatePath('/');
        return { success: isFullySettled ? 'Question fully settled.' : 'Side results published and bets updated.' };

    } catch (error: any) {
        console.error("Error settling question:", error);
        return { error: error.message || 'Failed to settle question.' };
    }
}


export async function settleMatchAndPayouts(matchId: string) {
    if (!matchId) return { error: 'Match ID is required.' };

    const matchRef = doc(db, 'matches', matchId);
    const questionsRef = collection(db, `matches/${matchId}/questions`);

    try {
        const matchDoc = await getDoc(matchRef);
        if (!matchDoc.exists() || matchDoc.data().status === 'Finished') {
            return { success: 'Match is already finished.', winners: [] };
        }
        
        const matchData = matchDoc.data();
        const questionsSnapshot = await getDocs(query(questionsRef, where('status', '==', 'active')));
        if (questionsSnapshot.empty) {
            await updateDoc(matchRef, { status: 'Finished' });
            revalidatePath('/admin/q-and-a');
            return { success: 'Match finished.', winners: [] };
        }

        const activeQuestions = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Question & { id: string })[];

        for (const q of activeQuestions) {
             if (q.type === 'qna') {
                 if (!q.result || typeof q.result.teamA !== 'string' || typeof q.result.teamB !== 'string') {
                    return { error: `Question "${q.question}" is missing results.` };
                 }
             } else if (q.type === 'player') {
                 if (!q.playerResult || typeof q.playerResult !== 'object') {
                    return { error: `Question "${q.question}" is missing player results.` };
                 }
             }
        }
        
        const betsRef = collection(db, 'bets');
        const pendingBetsQuery = query(betsRef, where('matchId', '==', matchId), where('status', '==', 'Pending'));
        const pendingBetsSnapshot = await getDocs(pendingBetsQuery);
        
        const payouts = new Map<string, number>();
        const betUpdates: { ref: any, data: any }[] = [];

        if (!pendingBetsSnapshot.empty) {
            for (const betDoc of pendingBetsSnapshot.docs) {
                const betData = betDoc.data();
                const betRef = doc(db, 'bets', betDoc.id);
                const betType = betData.betType || 'qna';

                let isWinner = true;
                if (betType === 'player') {
                    for (const prediction of betData.predictions) {
                        const [playerName, questionId] = prediction.questionId.split(':');
                        const teamSide = matchData.teamA.players?.some((p: any) => p.name === playerName) ? 'teamA' : 'teamB';
                        const question = activeQuestions.find(q => q.id === questionId);
                        if (!question || !question.playerResult) { isWinner = false; break; }
                        if (String((question.playerResult as any)?.[teamSide]?.[playerName] || '') !== String(prediction.predictedAnswer?.[teamSide] || '')) { isWinner = false; break; }
                    }
                } else {
                    for (const prediction of betData.predictions) {
                        const question = activeQuestions.find(q => q.id === prediction.questionId);
                        if (!question) { isWinner = false; break; }
                        const predA = (prediction.predictedAnswer?.teamA || '').trim().toLowerCase();
                        const predB = (prediction.predictedAnswer?.teamB || '').trim().toLowerCase();
                        if ((predA && predA !== question.result?.teamA) || (predB && predB !== question.result?.teamB)) { isWinner = false; break; }
                    }
                }

                if (isWinner) {
                    betUpdates.push({ ref: betRef, data: { status: 'Won' }});
                    payouts.set(betData.userId, (payouts.get(betData.userId) || 0) + betData.potentialWin);
                } else {
                    betUpdates.push({ ref: betRef, data: { status: 'Lost' }});
                }
            }
        }
        
        const batch = writeBatch(db);
        betUpdates.forEach(u => batch.update(u.ref, u.data));
        batch.update(matchRef, { status: 'Finished' });
        activeQuestions.forEach(q => batch.update(doc(questionsRef, q.id), { status: 'settled' }));
        for (const [uid, amt] of payouts.entries()) {
            batch.update(doc(db, 'users', uid), { walletBalance: increment(amt), totalWinnings: increment(amt) });
        }

        await batch.commit();
        revalidatePath('/admin/q-and-a');
        return { success: 'Match settled successfully!' };
    } catch (error: any) {
        console.error("Error settling match:", error);
        return { error: 'Failed to settle match.' };
    }
}

export async function getWinnersForMatch(matchId: string): Promise<Winner[]> {
    if (!matchId) return [];
    try {
        const matchDoc = await getDoc(doc(db, 'matches', matchId));
        if (matchDoc.exists() && matchDoc.data().winners) return matchDoc.data().winners as Winner[];
        
        const winningBetsQuery = query(collection(db, 'bets'), where('matchId', '==', matchId), where('status', '==', 'Won'));
        const winningBetsSnapshot = await getDocs(winningBetsQuery);
        if (winningBetsSnapshot.empty) return [];

        const userIds = Array.from(new Set(winningBetsSnapshot.docs.map(d => d.data().userId)));
        const usersMap = new Map<string, string>();
        if (userIds.length > 0) {
            const usersSnapshot = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', userIds.slice(0, 30))));
            usersSnapshot.forEach(u => usersMap.set(u.id, u.data().name || 'Unknown'));
        }

        return winningBetsSnapshot.docs.map(d => ({
            userId: d.data().userId,
            name: usersMap.get(d.data().userId) || 'Unknown',
            payoutAmount: d.data().potentialWin || 0,
        }));
    } catch (error) {
        return [];
    }
}
