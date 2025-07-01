
'use server';

import {
    collection,
    doc,
    writeBatch,
    query,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import { qnaItemSchema } from '@/lib/schemas';
import type { Question } from '@/lib/types';


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


// Updated server action to create/update questions for a single match
export async function updateQuestionsForMatch(matchId: string, questions: z.infer<typeof qnaItemSchema>[]) {
     if (!matchId) {
        return { error: 'A match ID must be provided.' };
    }
    
    // Zod validation for the questions array
    const questionsSchema = z.array(qnaItemSchema);
    const validatedQuestions = questionsSchema.safeParse(questions);

    if (!validatedQuestions.success) {
        console.error("Validation Errors:", validatedQuestions.error.flatten().fieldErrors);
        return { error: 'Invalid question data provided.' };
    }

    try {
        const batch = writeBatch(db);
        const questionsCollectionRef = collection(db, `matches/${matchId}/questions`);

        // First, delete all existing questions for this match to ensure a clean slate
        const existingQuestionsSnapshot = await getDocs(questionsCollectionRef);
        existingQuestionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Now, add the new questions
        validatedQuestions.data.forEach(q => {
            const questionRef = doc(questionsCollectionRef);
            // Add default odds on the backend
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
