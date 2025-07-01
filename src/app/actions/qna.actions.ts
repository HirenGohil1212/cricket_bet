'use server';

import {
    collection,
    doc,
    writeBatch,
    query,
    getDocs,
    Timestamp,
    where,
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import { qnaItemSchema } from '@/lib/schemas';
import type { Question, Sport } from '@/lib/types';


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
                options: data.options,
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


// Function to save a set of questions to a specific match
export async function saveQuestionsForMatch(matchId: string, questions: z.infer<typeof qnaItemSchema>[]) {
     if (!matchId) {
        return { error: 'A match ID must be provided.' };
    }
    
    const questionsSchema = z.array(qnaItemSchema);
    const validatedQuestions = questionsSchema.safeParse(questions);

    if (!validatedQuestions.success) {
        console.error("Validation Errors:", validatedQuestions.error.flatten().fieldErrors);
        return { error: 'Invalid question data provided.' };
    }

    try {
        const batch = writeBatch(db);
        const questionsCollectionRef = collection(db, `matches/${matchId}/questions`);

        const existingQuestionsSnapshot = await getDocs(questionsCollectionRef);
        existingQuestionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        validatedQuestions.data.forEach(q => {
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
export async function getQuestionTemplates(): Promise<Record<Sport, Question[]>> {
    const templates: Partial<Record<Sport, Question[]>> = {};
    try {
        const templatesRef = collection(db, 'questionTemplates');
        const querySnapshot = await getDocs(templatesRef);

        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            const questions = data.questions || [];
            templates[doc.id as Sport] = questions.map((q: any) => ({
                ...q,
                id: '', 
                createdAt: new Date().toISOString(),
                status: 'active',
                result: null,
            }));
        });
        return templates as Record<Sport, Question[]>;
    } catch (error) {
        console.error("Error fetching question templates:", error);
        return {} as Record<Sport, Question[]>;
    }
}

// Function to save a template and apply it to all upcoming/live matches
export async function saveTemplateAndApply(sport: Sport, questions: z.infer<typeof qnaItemSchema>[]) {
    const validatedQuestions = z.array(qnaItemSchema).safeParse(questions);
    if (!validatedQuestions.success) {
        return { error: 'Invalid question data provided.' };
    }

    const templateRef = doc(db, 'questionTemplates', sport);
    const matchesRef = collection(db, 'matches');
    
    try {
        const batch = writeBatch(db);
        batch.set(templateRef, { questions: validatedQuestions.data });

        const upcomingMatchesQuery = query(matchesRef, where('sport', '==', sport), where('status', 'in', ['Upcoming', 'Live']));
        const matchesSnapshot = await getDocs(upcomingMatchesQuery);

        for (const matchDoc of matchesSnapshot.docs) {
            const questionsCollectionRef = collection(db, `matches/${matchDoc.id}/questions`);
            
            const existingQuestionsSnapshot = await getDocs(questionsCollectionRef);
            existingQuestionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            validatedQuestions.data.forEach(q => {
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
        }
        
        await batch.commit();

        revalidatePath(`/admin/q-and-a`);
        return { success: `Template for ${sport} saved and applied to ${matchesSnapshot.size} matches.` };
    } catch (error: any) {
        console.error("Error saving template and applying to matches:", error);
        return { error: error.message || 'Failed to save template.' };
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
