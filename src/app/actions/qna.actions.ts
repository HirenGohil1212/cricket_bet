
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
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import { qnaFormSchema } from '@/lib/schemas';
import type { Question, Sport, QnaFormValues } from '@/lib/types';


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
                result: data.result && typeof data.result === 'object' ? data.result : null,
                options: data.options || [],
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
export async function saveQuestionResults(matchId: string, results: Record<string, { teamA: string, teamB: string }>) {
    if (!matchId) return { error: 'Match ID is required.' };

    const batch = writeBatch(db);
    const questionsRef = collection(db, `matches/${matchId}/questions`);

    for (const questionId in results) {
        const resultValue = results[questionId];
        // Only save if there is some data
        if (resultValue && (resultValue.teamA.trim() || resultValue.teamB.trim())) {
             const questionRef = doc(questionsRef, questionId);
             batch.update(questionRef, { result: resultValue });
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


// Modified function to settle bets and payout based on pre-saved results
export async function settleMatchAndPayouts(matchId: string) {
    if (!matchId) return { error: 'Match ID is required.' };
    
    const matchRef = doc(db, 'matches', matchId);
    const betsRef = collection(db, 'bets');
    const questionsRef = collection(db, `matches/${matchId}/questions`);

    try {
        const allQuestionsSnapshot = await getDocs(questionsRef);
        const questionsWithData = allQuestionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<Question, 'id' | 'createdAt'>, createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString() }));
        
        const activeQuestions = questionsWithData.filter(q => q.status === 'active');
        if (activeQuestions.length === 0) {
            return { error: 'No active questions to settle for this match.' };
        }
        
        const activeQuestionsHaveResults = activeQuestions.every(q => q.result && q.result.teamA.trim() && q.result.teamB.trim());
        if (!activeQuestionsHaveResults) {
            return { error: 'Cannot settle match. Not all active questions have saved results.' };
        }
        
        const resultsMap: Record<string, { teamA: string, teamB: string }> = {};
        questionsWithData.forEach(q => {
            if (q.result) {
                resultsMap[q.id] = q.result;
            }
        });

        await runTransaction(db, async (transaction) => {
            const pendingBetsQuery = query(betsRef, where('matchId', '==', matchId), where('status', '==', 'Pending'));
            const pendingBetsSnapshot = await transaction.get(pendingBetsQuery);
            
            const userWalletUpdates: Record<string, number> = {};
            
            // 1. Determine bet outcomes
            pendingBetsSnapshot.forEach(betDoc => {
                const bet = betDoc.data();
                const betResultRef = doc(db, 'bets', betDoc.id);
                
                // Robustness check for malformed bet data
                if (!bet.userId || typeof bet.potentialWin !== 'number' || !Array.isArray(bet.predictions)) {
                    console.warn(`Bet ${betDoc.id} is malformed. Marking as Lost.`);
                    transaction.update(betResultRef, { status: 'Lost' });
                    return; // Skip to next bet
                }

                let isWinner = true;
                if (bet.predictions.length === 0) {
                    isWinner = false;
                } else {
                    for (const prediction of bet.predictions) {
                        const winningResult = resultsMap[prediction.questionId];
                        
                        // A prediction is wrong if:
                        // - The question no longer exists (winningResult is falsy)
                        // - The user didn't provide an answer (predictedAnswer is falsy)
                        // - The user's answer doesn't match the result
                        if (!winningResult || 
                            !prediction.predictedAnswer ||
                            prediction.predictedAnswer.teamA.trim().toLowerCase() !== winningResult.teamA.trim().toLowerCase() ||
                            prediction.predictedAnswer.teamB.trim().toLowerCase() !== winningResult.teamB.trim().toLowerCase()
                        ) {
                            isWinner = false;
                            break;
                        }
                    }
                }
                
                if (isWinner) {
                    transaction.update(betResultRef, { status: 'Won' });
                    userWalletUpdates[bet.userId] = (userWalletUpdates[bet.userId] || 0) + bet.potentialWin;
                } else {
                    transaction.update(betResultRef, { status: 'Lost' });
                }
            });

            // 2. Update user wallets
            for (const userId in userWalletUpdates) {
                const userRef = doc(db, 'users', userId);
                const userDoc = await transaction.get(userRef);
                if (userDoc.exists()) {
                    const currentBalance = userDoc.data().walletBalance || 0;
                    const newBalance = currentBalance + userWalletUpdates[userId];
                    transaction.update(userRef, { walletBalance: newBalance });
                }
            }

            // 3. Update question statuses to 'settled'
            for (const question of activeQuestions) {
                 const questionRef = doc(questionsRef, question.id);
                 transaction.update(questionRef, { status: 'settled' });
            }

            // 4. Update match status
            transaction.update(matchRef, { status: 'Finished' });
        });

        revalidatePath(`/admin/q-and-a`);
        return { success: 'Match settled and payouts processed successfully!' };

    } catch (error: any) {
        console.error("Error settling match:", error);
        return { error: error.message || 'Failed to settle match.' };
    }
}
