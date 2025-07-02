
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
                result: data.result || null,
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
        if (resultValue && (resultValue.teamA?.trim() || resultValue.teamB?.trim())) {
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


// ** COMPLETELY REWRITTEN & ROBUST FUNCTION **
// Settles a match and processes payouts in a crash-proof manner.
export async function settleMatchAndPayouts(matchId: string) {
    if (!matchId) return { error: 'Match ID is required.' };

    const matchRef = doc(db, 'matches', matchId);
    const questionsRef = collection(db, `matches/${matchId}/questions`);

    try {
        // STEP 1: Pre-fetch all necessary data.
        const allQuestionsSnapshot = await getDocs(questionsRef);
        const questionsWithData = allQuestionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as (Question & { id: string })[];
        
        const activeQuestions = questionsWithData.filter(q => q.status === 'active');

        // If there are no active questions to settle, just mark the match as finished.
        if (activeQuestions.length === 0) {
            await updateDoc(matchRef, { status: 'Finished' });
            return { success: 'Match has no active questions and has been marked as Finished.' };
        }
        
        // Ensure every active question has a valid result object before proceeding.
        const activeQuestionsHaveResults = activeQuestions.every(q =>
            q.result && 
            (typeof q.result.teamA === 'string') &&
            (typeof q.result.teamB === 'string')
        );

        if (!activeQuestionsHaveResults) {
            return { error: 'Cannot settle match. Not all active questions have saved results for both teams.' };
        }
        
        // Create a simple map of question IDs to results for easy lookup.
        const resultsMap: Record<string, { teamA: string, teamB: string }> = {};
        activeQuestions.forEach(q => {
            if (q.result) {
                resultsMap[q.id] = q.result;
            }
        });

        // STEP 2: Use a transaction to process all pending bets atomically.
        await runTransaction(db, async (transaction) => {
            const betsRef = collection(db, 'bets');
            const pendingBetsQuery = query(betsRef, where('matchId', '==', matchId), where('status', '==', 'Pending'));
            const pendingBetsSnapshot = await transaction.get(pendingBetsQuery);
            
            for (const betDoc of pendingBetsSnapshot.docs) {
                const betData = betDoc.data();
                const betRef = doc(db, 'bets', betDoc.id);

                // --- AGGRESSIVE VALIDATION to prevent any crashes ---
                if (!betData || !betData.userId || typeof betData.userId !== 'string' || !betData.predictions || !Array.isArray(betData.predictions)) {
                    transaction.update(betRef, { status: 'Lost', reason: 'Corrupted bet data.' });
                    continue; // Skip this corrupted bet
                }
                
                // A bet can only win if the number of predictions matches the number of active questions.
                if (betData.predictions.length !== activeQuestions.length) {
                    transaction.update(betRef, { status: 'Lost', reason: 'Prediction count mismatch.' });
                    continue;
                }

                // --- COMPARISON LOGIC ---
                let isWinner = true;
                for (const prediction of betData.predictions) {
                    // Validate each prediction object.
                    if (!prediction || typeof prediction.questionId !== 'string' || !prediction.predictedAnswer) {
                        isWinner = false;
                        break;
                    }

                    const correctResult = resultsMap[prediction.questionId];
                    const userAnswer = prediction.predictedAnswer;

                    // If a prediction is for a question that isn't active/settled, or the answer format is wrong, the bet loses.
                    if (!correctResult || typeof userAnswer.teamA !== 'string' || typeof userAnswer.teamB !== 'string') {
                        isWinner = false;
                        break;
                    }

                    const teamA_match = userAnswer.teamA.trim().toLowerCase() === correctResult.teamA.trim().toLowerCase();
                    const teamB_match = userAnswer.teamB.trim().toLowerCase() === correctResult.teamB.trim().toLowerCase();

                    if (!teamA_match || !teamB_match) {
                        isWinner = false;
                        break; // One incorrect prediction is enough to lose.
                    }
                }

                // --- PAYOUT or LOSS LOGIC ---
                if (isWinner) {
                    // Final validation of user and payout amount before updating balance.
                    if (typeof betData.potentialWin === 'number' && betData.potentialWin > 0) {
                        const userRef = doc(db, 'users', betData.userId); // This is now safe due to the aggressive validation above.
                        const userDoc = await transaction.get(userRef);

                        if (userDoc.exists()) {
                            const currentBalance = userDoc.data().walletBalance || 0;
                            const newBalance = currentBalance + betData.potentialWin;
                            transaction.update(userRef, { walletBalance: newBalance });
                            transaction.update(betRef, { status: 'Won' });
                        } else {
                            transaction.update(betRef, { status: 'Lost', reason: 'User not found for payout' });
                        }
                    } else {
                        transaction.update(betRef, { status: 'Lost', reason: 'Invalid potential win amount' });
                    }
                } else {
                    transaction.update(betRef, { status: 'Lost' });
                }
            } // End of for...of loop for bets

            // STEP 3: After processing all bets, update all active questions to 'settled' and the match to 'Finished'.
            for (const question of activeQuestions) {
                const questionRef = doc(db, `matches/${matchId}/questions/${question.id}`);
                transaction.update(questionRef, { status: 'settled' });
            }
            transaction.update(matchRef, { status: 'Finished' });
        });

        // Revalidate paths to reflect changes in the UI.
        // Added checks to prevent runtime errors as requested.
        try {
            if (typeof revalidatePath === 'function') {
                revalidatePath(`/admin/q-and-a`);
                revalidatePath(`/`);
                revalidatePath(`/wallet`);
            } else {
                console.warn('revalidatePath is not a function, skipping cache invalidation.');
            }
        } catch (e) {
            console.error('Failed to revalidate paths after match settlement:', e);
        }
        
        return { success: 'Match settled and payouts processed successfully!' };

    } catch (error: any) {
        console.error("Error settling match:", error);
        return { error: error.message || 'Failed to settle match. An unknown error occurred.' };
    }
}
