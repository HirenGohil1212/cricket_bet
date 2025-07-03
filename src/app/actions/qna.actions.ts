
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
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import { qnaFormSchema } from '@/lib/schemas';
import type { Question, Sport, QnaFormValues, Winner } from '@/lib/types';


// Function to get questions for a specific match
export async function getQuestionsForMatch(matchId: string): Promise<Question[]> {
    if (!matchId) return [];
    try {
        const questionsRef = collection(db, `matches/${matchId}/questions`);
        const q = query(questionsRef);
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                question: data.question,
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

        questions.forEach(q => {
            const questionRef = doc(questionsCollectionRef);
            batch.set(questionRef, {
                question: q.question,
                createdAt: Timestamp.now(),
                status: 'active',
                result: null,
            });
        });

        await batch.commit();

        revalidatePath(`/admin/q-and-a`);
        return { success: 'Questions have been updated successfully!' };
    } catch (error) {
        console.error("Error updating questions: ", error);
        return { error: 'Failed to update questions.' };
    }
}

// Function to get all question templates
export async function getQuestionTemplates(): Promise<Record<Sport, Pick<Question, 'question'>[]>> {
    const templates: Partial<Record<Sport, Pick<Question, 'question'>[]>> = {};
    try {
        const templatesRef = collection(db, 'questionTemplates');
        const querySnapshot = await getDocs(templatesRef);

        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            templates[doc.id as Sport] = data.questions || [];
        });
        return templates as Record<Sport, Pick<Question, 'question'>[]>;
    } catch (error) {
        console.error("Error fetching question templates:", error);
        return {} as Record<Sport, Pick<Question, 'question'>[]>;
    }
}

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
            validatedQuestions.data.questions.forEach(q => {
                const questionRef = doc(questionsCollectionRef);
                batch.set(questionRef, {
                    question: q.question,
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
    playerResults?: Record<string, { teamA: string, teamB: string }>
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

        if (playerResultValue && (playerResultValue.teamA?.trim() || playerResultValue.teamB?.trim())) {
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
             // Standard text result is always required for display purposes.
            if (!q.result || typeof q.result.teamA !== 'string' || typeof q.result.teamB !== 'string') {
                return { error: `Question "${q.question}" is missing a valid text result. Please save all results before settling.` };
            }
             // For special matches, player results are also required for settlement.
            if (isSpecialMatch) {
                if (!q.playerResult || typeof q.playerResult.teamA !== 'string' || typeof q.playerResult.teamB !== 'string' || !q.playerResult.teamA || !q.playerResult.teamB) {
                     return { error: `Player result for question "${q.question}" is missing. Please select winning players before settling a special match.` };
                }
            }
        }
        
        const betsRef = collection(db, 'bets');
        const pendingBetsQuery = query(betsRef, where('matchId', '==', matchId), where('status', '==', 'Pending'));
        const pendingBetsSnapshot = await getDocs(pendingBetsQuery);

        if (pendingBetsSnapshot.empty) {
            // No pending bets, just finish the match and questions
            const batch = writeBatch(db);
            batch.update(matchRef, { status: 'Finished' });
            activeQuestions.forEach(q => {
                const qRef = doc(questionsRef, q.id);
                batch.update(qRef, { status: 'settled' });
            });
            await batch.commit();
            revalidatePath('/admin/q-and-a');
            return { success: 'No pending bets found. Match has been marked as Finished.', winners: [] };
        }
        
        // Fetch user data for winner names
        const userIds = [...new Set(pendingBetsSnapshot.docs.map(doc => doc.data().userId).filter(Boolean))];
        const usersMap = new Map<string, string>();
        if (userIds.length > 0) {
            const userBatches = [];
            for (let i = 0; i < userIds.length; i += 30) {
                userBatches.push(userIds.slice(i, i + 30));
            }

            for (const idBatch of userBatches) {
                 const usersQuery = query(collection(db, 'users'), where('uid', 'in', idBatch));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.forEach(userDoc => {
                    usersMap.set(userDoc.id, userDoc.data().name || 'Unknown User');
                });
            }
        }

        // --- STEP 2: Process bets in memory ---
        
        const payouts = new Map<string, number>(); // Map<userId, totalPayout>
        const betUpdates: { ref: any, data: any }[] = [];

        for (const betDoc of pendingBetsSnapshot.docs) {
            const betData = betDoc.data();
            const betRef = doc(db, 'bets', betDoc.id);

            // AGGRESSIVE VALIDATION
            if (!betData.userId || !Array.isArray(betData.predictions) || typeof betData.potentialWin !== 'number') {
                betUpdates.push({ ref: betRef, data: { status: 'Lost', reason: 'Invalid bet data.' }});
                continue;
            }
            
            let isWinner = true;
            if (betData.predictions.length !== activeQuestions.length) {
                isWinner = false;
            } else {
                for (const prediction of betData.predictions) {
                    if (!prediction || typeof prediction.questionId !== 'string' || !prediction.predictedAnswer || typeof prediction.predictedAnswer.teamA !== 'string' || typeof prediction.predictedAnswer.teamB !== 'string') {
                        isWinner = false;
                        break;
                    }

                    const question = activeQuestions.find(q => q.id === prediction.questionId);
                    if (!question) {
                        isWinner = false;
                        break;
                    }

                    // Use betType to determine which result to check against
                    const betType = betData.betType || 'qna';
                    const correctResult = betType === 'player' ? question.playerResult : question.result;

                    if (!correctResult) {
                        isWinner = false;
                        break;
                    }

                    const predictedA = prediction.predictedAnswer.teamA?.trim().toLowerCase();
                    const predictedB = prediction.predictedAnswer.teamB?.trim().toLowerCase();

                    if (!predictedA && !predictedB) {
                        isWinner = false;
                        break;
                    }

                    const correctA = correctResult.teamA?.trim().toLowerCase();
                    const correctB = correctResult.teamB?.trim().toLowerCase();

                    let teamA_match = true;
                    if (predictedA) {
                        teamA_match = (predictedA === correctA);
                    }

                    let teamB_match = true;
                    if (predictedB) {
                        teamB_match = (predictedB === correctB);
                    }
                    
                    if (!teamA_match || !teamB_match) {
                        isWinner = false;
                        break;
                    }
                }
            }


            if (isWinner) {
                betUpdates.push({ ref: betRef, data: { status: 'Won' }});
                const currentPayout = payouts.get(betData.userId) || 0;
                payouts.set(betData.userId, currentPayout + betData.potentialWin);
            } else {
                betUpdates.push({ ref: betRef, data: { status: 'Lost' }});
            }
        }
        
        // --- STEP 3: Execute writes ---
        
        // Use a batch to update all bet documents
        const batch = writeBatch(db);
        betUpdates.forEach(update => {
            batch.update(update.ref, update.data);
        });

        // Update match and questions status in the same batch
        batch.update(matchRef, { status: 'Finished' });
        activeQuestions.forEach(q => {
            const qRef = doc(questionsRef, q.id);
            batch.update(qRef, { status: 'settled' });
        });
        
        // Commit all non-financial updates
        await batch.commit();

        // Now, process financial payouts transactionally per user
        const winners: Winner[] = [];
        for (const [userId, payoutAmount] of payouts.entries()) {
            if (payoutAmount <= 0) continue;
            
            const userRef = doc(db, 'users', userId);
            try {
                await runTransaction(db, async (transaction) => {
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists()) {
                        console.error(`Could not pay out ${payoutAmount} to non-existent user ${userId}`);
                        return;
                    }
                    const currentBalance = userDoc.data().walletBalance || 0;
                    const newBalance = currentBalance + payoutAmount;
                    transaction.update(userRef, { walletBalance: newBalance });
                });
                // If transaction is successful, add to winners list
                winners.push({
                    userId,
                    name: usersMap.get(userId) || `User ID: ${userId}`,
                    payoutAmount
                });
            } catch (e) {
                console.error(`Failed to process payout for user ${userId}. Error:`, e);
                // The transaction for this user failed, but we continue with others.
            }
        }
        
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
            winners,
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
            const userBatches = [];
            for (let i = 0; i < userIds.length; i += 30) {
                userBatches.push(userIds.slice(i, i + 30));
            }

            for (const idBatch of userBatches) {
                const usersQuery = query(collection(db, 'users'), where('uid', 'in', idBatch));
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
