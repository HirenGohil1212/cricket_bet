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
    increment
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import { qnaFormSchema } from '@/lib/schemas';
import type { Question, Sport, QnaFormValues, Winner, DummyUser } from '@/lib/types';


// --- Question Bank Actions ---

export async function createQuestionInBank(questionText: string, sport: Sport) {
    if (!questionText || !questionText.trim()) {
        return { error: 'Question text cannot be empty.' };
    }
    try {
        const docRef = await addDoc(collection(db, 'questionBank'), {
            question: questionText.trim(),
            sport: sport,
            createdAt: Timestamp.now(),
        });

        const newQuestion: Question = {
            id: docRef.id,
            question: questionText.trim(),
            sport: sport,
            createdAt: new Date().toISOString(),
            order: 0, 
            status: 'active',
            result: null,
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
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString()
        } as Question));
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


// Function to get questions for a specific match
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
                order: data.order,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                status: data.status,
                result: data.result || null,
                playerResult: data.playerResult || null,
            } as Question;
        });
    } catch (error) {
        console.error("Error fetching questions for match:", error);
        return [];
    }
}

// Overwrites the questions for a specific match.
export async function saveQuestionsForMatch(matchId: string, questions: { question: string; }[]) {
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
                order: index, // Add order field
                createdAt: Timestamp.now(),
                status: 'active',
                result: null,
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

// THIS ACTION IS NO LONGER USED in the new admin flow but kept for potential future use.
// Function to save a template and apply it to all upcoming/live matches
export async function saveTemplateAndApply(sport: Sport, questions: QnaFormValues['questions']) {
    const validatedQuestions = qnaFormSchema.safeParse({ questions });
    if (!validatedQuestions.success) {
        return { error: 'Invalid question data provided.' };
    }

    const templateRef = doc(db, 'questionTemplates', sport);
    const matchesRef = collection(db, 'matches');
    
    try {
        const batch = writeBatch(db);
        // Save the template itself
        batch.set(templateRef, { questions: validatedQuestions.data.questions });

        const upcomingMatchesQuery = query(matchesRef, where('sport', '==', sport), where('status', 'in', ['Upcoming', 'Live']));
        const matchesSnapshot = await getDocs(upcomingMatchesQuery);

        // Apply template to all relevant matches
        for (const matchDoc of matchesSnapshot.docs) {
            const questionsCollectionRef = collection(db, `matches/${matchDoc.id}/questions`);
            
            // Clear existing questions
            const existingQuestionsSnapshot = await getDocs(questionsCollectionRef);
            existingQuestionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Add new questions from the template
            validatedQuestions.data.questions.forEach((q, index) => {
                const questionRef = doc(questionsCollectionRef);
                batch.set(questionRef, {
                    question: q.question,
                    order: index, // Add order field
                    createdAt: Timestamp.now(),
                    status: 'active',
                    result: null,
                    playerResult: null,
                });
            });
        }
        
        await batch.commit();

        revalidatePath(`/admin/q-and-a`);
        return { success: `Template for ${sport} saved and applied to ${matchesSnapshot.size} matches.` };
    } catch (error: any) {
        console.error("Error saving template and applying to matches:", error);
        return { error: error.message || 'Failed to save template.' };
    }
}

// New Function to just save the results for questions
export async function saveQuestionResults(
    matchId: string, 
    results: Record<string, { teamA: string, teamB: string }>,
    playerResults?: Record<string, any>
) {
    if (!matchId) return { error: 'Match ID is required.' };

    const batch = writeBatch(db);
    const questionsRef = collection(db, `matches/${matchId}/questions`);
    
    const allQuestionIds = new Set([...Object.keys(results), ...Object.keys(playerResults || {})]);

    for (const questionId of allQuestionIds) {
        const resultValue = results[questionId];
        const playerResultValue = playerResults?.[questionId];
        
        const updateData: { result?: any; playerResult?: any } = {};
        
        if (resultValue && (resultValue.teamA?.trim() || resultValue.teamB?.trim())) {
            updateData.result = resultValue;
        }

        if (playerResultValue && Object.keys(playerResultValue).length > 0) {
            updateData.playerResult = playerResultValue;
        }

        if (Object.keys(updateData).length > 0) {
            const questionRef = doc(questionsRef, questionId);
            batch.update(questionRef, updateData);
        }
    }


    try {
        await batch.commit();
        revalidatePath(`/admin/q-and-a`);
        return { success: 'Results have been saved successfully.' };
    } catch (error: any) {
        console.error("Error saving question results:", error);
        return { error: error.message || 'Failed to save results.' };
    }
}


// ** COMPLETELY REWRITTEN & ROBUST FUNCTION **
// Settles a match and processes payouts in a crash-proof manner.
export async function settleMatchAndPayouts(matchId: string) {
    if (!matchId) return { error: 'Match ID is required.' };

    const matchRef = doc(db, 'matches', matchId);
    const questionsRef = collection(db, `matches/${matchId}/questions`);
    const summaryRef = doc(db, 'statistics', 'financialSummary');

    try {
        // --- STEP 1: Fetch all data needed, outside any transaction ---
        const matchDoc = await getDoc(matchRef);
        if (!matchDoc.exists() || matchDoc.data().status === 'Finished') {
            return { success: 'Match is already finished or does not exist.', winners: [] };
        }
        
        const matchData = matchDoc.data();
        const isSpecialMatch = matchData.isSpecialMatch || false;

        const questionsSnapshot = await getDocs(query(questionsRef, where('status', '==', 'active')));
        if (questionsSnapshot.empty) {
            // No active questions, just finish the match
            await updateDoc(matchRef, { status: 'Finished' });
            revalidatePath('/admin/q-and-a');
            return { success: 'Match marked as Finished as there were no active questions.', winners: [] };
        }

        const activeQuestions = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Question & { id: string })[];

        // Validate that all active questions have results
        for (const q of activeQuestions) {
             if (!q.result || typeof q.result.teamA !== 'string' || typeof q.result.teamB !== 'string') {
                return { error: `Question "${q.question}" is missing a valid team result. Please save all results before settling.` };
             }

             if (isSpecialMatch) {
                if (!q.playerResult || typeof q.playerResult !== 'object' || Object.keys(q.playerResult).length === 0) {
                    return { error: `Player results for question "${q.question}" are missing or invalid. Please save all player results before settling.` };
                }
            }
        }
        
        const betsRef = collection(db, 'bets');
        const pendingBetsQuery = query(betsRef, where('matchId', '==', matchId), where('status', '==', 'Pending'));
        const pendingBetsSnapshot = await getDocs(pendingBetsQuery);
        
        // --- STEP 2: Process bets in memory ---
        
        let totalMatchPayouts = 0;
        let totalMatchWagered = 0;
        const payouts = new Map<string, number>(); // Map<userId, totalPayout>
        const betUpdates: { ref: any, data: any }[] = [];

        if (!pendingBetsSnapshot.empty) {
            for (const betDoc of pendingBetsSnapshot.docs) {
                const betData = betDoc.data();
                const betRef = doc(db, 'bets', betDoc.id);
                const betType = betData.betType || 'qna';

                totalMatchWagered += betData.amount;

                // AGGRESSIVE VALIDATION
                if (!betData.userId || !Array.isArray(betData.predictions) || typeof betData.potentialWin !== 'number') {
                    betUpdates.push({ ref: betRef, data: { status: 'Lost', reason: 'Invalid bet data.' }});
                    continue;
                }
                
                let isWinner = true;

                if (betType === 'player') {
                    // For player bets, every single prediction must match
                    for (const prediction of betData.predictions) {
                        const [playerName, questionId] = prediction.questionId.split(':');
                        
                        let teamSide: 'teamA' | 'teamB' | null = null;
                        if (matchData.teamA.players?.some((p: any) => p.name === playerName)) {
                            teamSide = 'teamA';
                        } else if (matchData.teamB.players?.some((p: any) => p.name === playerName)) {
                            teamSide = 'teamB';
                        }

                        if (!teamSide) {
                            isWinner = false;
                            break;
                        }

                        const question = activeQuestions.find(q => q.id === questionId);
                        if (!question || !question.playerResult) {
                            isWinner = false;
                            break;
                        }
                        
                        const correctAnswer = (question.playerResult as any)?.[teamSide]?.[playerName];
                        const predictedAnswer = teamSide === 'teamA' ? prediction.predictedAnswer?.teamA : prediction.predictedAnswer?.teamB;
                        
                        if (String(correctAnswer || '').trim() !== String(predictedAnswer || '').trim()) {
                            isWinner = false;
                            break;
                        }
                    }
                } else { // QnA mode
                    if (betData.predictions.length !== activeQuestions.length) {
                        isWinner = false;
                    } else {
                        for (const prediction of betData.predictions) {
                            if (!isWinner) break; // No need to check further if already lost

                            const question = activeQuestions.find(q => q.id === prediction.questionId);
                            if (!question) {
                                isWinner = false;
                                continue;
                            }
                            
                            const predictedAnswer = prediction.predictedAnswer;
                            if (!predictedAnswer || typeof predictedAnswer.teamA !== 'string' || typeof predictedAnswer.teamB !== 'string') {
                                isWinner = false;
                                continue;
                            }

                            const normalizedPredictedA = predictedAnswer.teamA.trim().toLowerCase();
                            const normalizedPredictedB = predictedAnswer.teamB.trim().toLowerCase();
                            
                            const correctA = (question.result?.teamA ?? '').trim().toLowerCase();
                            const correctB = (question.result?.teamB ?? '').trim().toLowerCase();

                            if (normalizedPredictedA !== correctA || normalizedPredictedB !== correctB) {
                                isWinner = false;
                            }
                        }
                    }
                }

                if (isWinner) {
                    betUpdates.push({ ref: betRef, data: { status: 'Won' }});
                    const currentPayout = payouts.get(betData.userId) || 0;
                    payouts.set(betData.userId, currentPayout + betData.potentialWin);
                    totalMatchPayouts += betData.potentialWin;
                } else {
                    betUpdates.push({ ref: betRef, data: { status: 'Lost' }});
                }
            }
        }
        
        let finalWinners: Winner[] = [];
        
        // Handle real user payouts
        if (payouts.size > 0) {
            const userIds = Array.from(payouts.keys());
            const usersMap = new Map<string, string>();
            const userBatches = [];
            for (let i = 0; i < userIds.length; i += 30) {
                userBatches.push(userIds.slice(i, i + 30));
            }
            for (const idBatch of userBatches) {
                 const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', idBatch));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.forEach(userDoc => {
                    usersMap.set(userDoc.id, userDoc.data().name || 'Unknown User');
                });
            }

            for (const [userId, payoutAmount] of payouts.entries()) {
                finalWinners.push({
                    userId,
                    name: usersMap.get(userId) || `User ID: ${userId}`,
                    payoutAmount
                });
            }
        }

        // --- NEW DUMMY USER LOGIC ---
        // If there are no real winners, check for dummy winners.
        if (finalWinners.length === 0 && matchData.dummyWinners && matchData.dummyWinners.length > 0) {
            const dummyUserIds = matchData.dummyWinners.map((dw: any) => dw.userId);
            if (dummyUserIds.length > 0) {
                const dummyUsersQuery = query(collection(db, 'dummyUsers'), where(documentId(), 'in', dummyUserIds));
                const dummyUsersSnapshot = await getDocs(dummyUsersQuery);
                const dummyUsersMap = new Map();
                dummyUsersSnapshot.forEach(doc => {
                    dummyUsersMap.set(doc.id, doc.data());
                });

                matchData.dummyWinners.forEach((dw: any) => {
                    const dummyUser = dummyUsersMap.get(dw.userId);
                    if (dummyUser) {
                        finalWinners.push({
                            userId: `dummy-${dw.userId}`,
                            name: dummyUser.name,
                            payoutAmount: dw.amount
                        });
                    }
                });
            }
        }

        // --- STEP 3: Execute writes ---
        
        // Use a batch to update all bet documents
        const batch = writeBatch(db);
        betUpdates.forEach(update => {
            batch.update(update.ref, update.data);
        });

        // Update match and questions status in the same batch
        batch.update(matchRef, { status: 'Finished', winners: finalWinners }); // Save winners to match
        activeQuestions.forEach(q => {
            const qRef = doc(questionsRef, q.id);
            batch.update(qRef, { status: 'settled' });
        });
        
        // Commit all non-financial updates
        await batch.commit();

        // Now, process financial payouts for REAL users and update all-time summary transactionally
        await runTransaction(db, async (transaction) => {
            for (const [userId, payoutAmount] of payouts.entries()) {
                if (payoutAmount <= 0) continue;
                
                const userRef = doc(db, 'users', userId);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) {
                    console.error(`Could not pay out ${payoutAmount} to non-existent user ${userId}`);
                    continue;
                }
                const currentBalance = userDoc.data().walletBalance || 0;
                const newBalance = currentBalance + payoutAmount;
                transaction.update(userRef, { walletBalance: newBalance });
            }

            // Update the all-time summary document
            transaction.update(summaryRef, {
                totalWagered: increment(totalMatchWagered),
                totalPayouts: increment(totalMatchPayouts)
            });
        });
        
        try {
            if (typeof revalidatePath === 'function') {
                revalidatePath('/admin/q-and-a');
                revalidatePath('/');
                revalidatePath('/wallet');
            }
        } catch (e) {
            console.error('Failed to revalidate paths:', e);
        }
        
        return { 
            success: 'Match settled and payouts processed successfully!',
            winners: finalWinners,
            totalBetsProcessed: pendingBetsSnapshot.size,
        };

    } catch (error: any) {
        console.error("Error settling match:", error);
        return { error: error.message || 'Failed to settle match. An unknown error occurred.' };
    }
}


// New function to get winners for a finished match
export async function getWinnersForMatch(matchId: string): Promise<Winner[]> {
    if (!matchId) return [];

    try {
        const matchDoc = await getDoc(doc(db, 'matches', matchId));
        if (matchDoc.exists() && matchDoc.data().winners) {
            return matchDoc.data().winners as Winner[];
        }
        
        // Fallback for older matches settled before winners were stored on the match
        const betsRef = collection(db, 'bets');
        const winningBetsQuery = query(betsRef, where('matchId', '==', matchId), where('status', '==', 'Won'));
        const winningBetsSnapshot = await getDocs(winningBetsQuery);

        if (winningBetsSnapshot.empty) {
            return [];
        }

        const userIdsToFetch = new Set<string>();
        const betsData = winningBetsSnapshot.docs.map(doc => {
            const data = doc.data();
            if (data.userId) {
                userIdsToFetch.add(data.userId);
            }
            return { id: doc.id, ...data };
        });

        const usersMap = new Map<string, string>();
        if (userIdsToFetch.size > 0) {
            const userIds = Array.from(userIdsToFetch);
            // Firestore 'in' query can handle up to 30 items. We batch them.
            const userBatches = [];
            for (let i = 0; i < userIds.length; i += 30) {
                userBatches.push(userIds.slice(i, i + 30));
            }

            for (const idBatch of userBatches) {
                const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', idBatch));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.forEach(userDoc => {
                    usersMap.set(userDoc.id, userDoc.data().name || 'Unknown User');
                });
            }
        }

        const winners: Winner[] = betsData
            .filter(betData => betData.userId)
            .map(betData => ({
                userId: betData.userId,
                name: usersMap.get(betData.userId) || `User ID: ${betData.userId}`,
                payoutAmount: betData.potentialWin || 0,
            }));

        return winners;

    } catch (error) {
        console.error("Error fetching winners for match:", error);
        return [];
    }
}
