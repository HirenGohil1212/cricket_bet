'use server';

import {
    collection,
    doc,
    writeBatch,
    query,
    getDocs,
    Timestamp,
    where,
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
                options: data.options || [],
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                status: data.status,
                result: data.result,
            } as Question;
        });
    } catch (error) {
        console.error("Error fetching questions for match:", error);
        return [];
    }
}

// Overwrites the questions for a specific match.
export async function saveQuestionsForMatch(matchId: string, questions: { question: string; options: {text: string}[] }[]) {
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
            const optionsWithOdds = q.options.map(opt => ({ ...opt, odds: 2.0 }));
            batch.set(questionRef, {
                question: q.question,
                options: optionsWithOdds,
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
                    options: [], // Options will be set per-match later
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

// Function to set the options for questions of a given match
export async function setQuestionOptions(matchId: string, options: Record<string, { optionA: string, optionB: string }>) {
    if (!matchId) return { error: 'Match ID is required.' };
    if (Object.keys(options).length === 0) return { error: 'No options provided.' };
    
    try {
        const batch = writeBatch(db);
        const questionsRef = collection(db, `matches/${matchId}/questions`);

        for (const questionId in options) {
            const { optionA, optionB } = options[questionId];
            if (optionA && optionB) {
                const questionRef = doc(questionsRef, questionId);
                const optionsWithOdds = [
                    { text: optionA, odds: 2.0 },
                    { text: optionB, odds: 2.0 },
                ];
                batch.update(questionRef, { options: optionsWithOdds });
            }
        }
        
        await batch.commit();

        revalidatePath(`/admin/q-and-a`);
        return { success: 'Options have been saved successfully!' };
    } catch (error: any) {
        console.error("Error setting options:", error);
        return { error: error.message || 'Failed to save options.' };
    }
}


// Function to set the results for questions of a given match
export async function setQuestionResults(matchId: string, results: Record<string, string>) {
    if (!matchId) return { error: 'Match ID is required.' };
    if (Object.keys(results).length === 0) return { error: 'No results provided.' };
    
    try {
        const batch = writeBatch(db);
        const questionsRef = collection(db, `matches/${matchId}/questions`);

        for (const questionId in results) {
            const result = results[questionId];
            if (result) {
                const questionRef = doc(questionsRef, questionId);
                batch.update(questionRef, {
                    result: result,
                    status: 'settled',
                });
            }
        }
        
        await batch.commit();

        // TODO: Payout logic for winning bets would go here in a real scenario

        revalidatePath(`/admin/q-and-a`);
        return { success: 'Results have been saved successfully!' };
    } catch (error: any) {
        console.error("Error setting results:", error);
        return { error: error.message || 'Failed to save results.' };
    }
}
