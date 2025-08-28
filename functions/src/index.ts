
'use strict';

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { endOfDay, startOfDay, subDays } from 'date-fns';

// Initialize the Firebase Admin SDK.
admin.initializeApp();
const db = admin.firestore();

// Define the function to run on a schedule.
// This cron string means "at 00:00 on day-of-month 1 in every 2nd month".
// This approximates a ~60 day cycle. For a true 45-day cycle, you'd need
// an external scheduler, but this is a robust "set it and forget it" solution.
export const scheduledDataCleanup = functions.pubsub
  .schedule('0 0 */45 * *')
  .timeZone('UTC') // Set to your preferred timezone, e.g., 'Asia/Kolkata'
  .onRun(async (context) => {
    functions.logger.log('Starting scheduled data cleanup...');

    const collectionsToDelete = ['bets', 'deposits', 'withdrawals', 'matches'];
    const dateFieldMap: { [key: string]: string } = {
        bets: 'timestamp',
        deposits: 'createdAt',
        withdrawals: 'createdAt',
        matches: 'startTime',
    };

    // Calculate the date range: from the beginning of time until 45 days ago.
    const endDate = endOfDay(subDays(new Date(), 45));
    let totalDeleted = 0;

    for (const collectionName of collectionsToDelete) {
        const dateField = dateFieldMap[collectionName];
        if (!dateField) continue;

        // Query for documents older than our end date.
        const q = db.collection(collectionName).where(dateField, '<=', endDate);
        const snapshot = await q.get();

        if (snapshot.empty) {
            functions.logger.log(`No old documents to delete in ${collectionName}.`);
            continue;
        }

        const batch = db.batch();
        let deletedInCollection = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // Safety Check: Do not delete pending requests or active matches.
            if ((collectionName === 'deposits' || collectionName === 'withdrawals') && data.status === 'Processing') {
                return; // Skip this document
            }
            if (collectionName === 'matches' && ['Upcoming', 'Live'].includes(data.status)) {
                return; // Skip this document
            }

            batch.delete(doc.ref);
            deletedInCollection++;
        });

        await batch.commit();
        totalDeleted += deletedInCollection;
        functions.logger.log(`Deleted ${deletedInCollection} documents from ${collectionName}.`);
    }

    functions.logger.log(`SUCCESS: Scheduled data cleanup finished. Deleted ${totalDeleted} total documents.`);
    return null;
});

