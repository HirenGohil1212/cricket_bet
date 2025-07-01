
'use server';

import { collection, doc, writeBatch, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import { qnaFormSchema, type QnAFormValues } from '@/lib/schemas';
import type { Sport } from '@/lib/types';

export async function createQuestions(values: QnAFormValues, sport: Sport) {
    try {
        const validatedFields = qnaFormSchema.safeParse(values);

        if (!validatedFields.success) {
            console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
            return { error: 'Invalid fields provided.' };
        }

        const { applyTo, matchId, questions } = validatedFields.data;

        if (applyTo === 'single' && !matchId) {
            return { error: 'A match must be selected.' };
        }
        
        const batch = writeBatch(db);

        const createQuestionsForMatch = (matchDocId: string) => {
            const questionsCollectionRef = collection(db, `matches/${matchDocId}/questions`);
            questions.forEach(q => {
                const questionRef = doc(questionsCollectionRef);
                batch.set(questionRef, {
                    question: q.question,
                    options: q.options,
                    createdAt: Timestamp.now(),
                    status: 'active', // e.g., 'active', 'closed', 'settled'
                    result: null, // To store the winning option text later
                });
            });
        };

        if (applyTo === 'single' && matchId) {
            createQuestionsForMatch(matchId);
        } else if (applyTo === 'all') {
            // Find all upcoming matches for the given sport
            const matchesRef = collection(db, 'matches');
            const q = query(
                matchesRef, 
                where('sport', '==', sport),
                where('status', 'in', ['Upcoming', 'Live'])
            );
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return { error: `No upcoming or live matches found for ${sport} to apply questions to.` };
            }

            querySnapshot.forEach(doc => {
                createQuestionsForMatch(doc.id);
            });
        }

        await batch.commit();

        revalidatePath('/admin/q-and-a');
        return { success: 'Questions have been created successfully!' };
    } catch (error) {
        console.error("Error creating questions: ", error);
        return { error: 'Failed to create questions.' };
    }
}
