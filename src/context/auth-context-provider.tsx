

'use client';

import { useEffect, useState, ReactNode, useContext } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, Timestamp, collection, query, where } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pendingWagered, setPendingWagered] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        
        const userDocRef = doc(db, 'users', authUser.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists() && doc.id === authUser.uid) {
                const data = doc.data();
                if (data.disabled) { // Check for the disabled flag
                    setUser(null);
                    setUserProfile(null);
                    setPendingWagered(0);
                    setLoading(false);
                    auth.signOut(); // Force sign out if disabled
                    return;
                }
                const profile: UserProfile = {
                    uid: doc.id,
                    name: data.name,
                    phoneNumber: data.phoneNumber,
                    walletBalance: data.walletBalance,
                    referralCode: data.referralCode,
                    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                    role: data.role || 'user',
                    permissions: data.permissions || {},
                    bankAccount: data.bankAccount || undefined,
                    referredBy: data.referredBy,
                    isFirstBetPlaced: data.isFirstBetPlaced,
                    referralBonusAwarded: data.referralBonusAwarded,
                    totalWagered: data.totalWagered || 0,
                    totalWinnings: data.totalWinnings || 0,
                    totalDeposits: data.totalDeposits || 0,
                    totalWithdrawals: data.totalWithdrawals || 0,
                    disabled: data.disabled || false,
                };
                setUserProfile(profile);
            }
            else if (!doc.exists()) {
                 setUserProfile(null);
            }
            setLoading(false);
        });

        const betsQuery = query(collection(db, 'bets'), where('userId', '==', authUser.uid), where('status', '==', 'Pending'));
        const unsubscribeBets = onSnapshot(betsQuery, (snapshot) => {
            const totalPending = snapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
            setPendingWagered(totalPending);
        });

        return () => {
            unsubscribeUser();
            unsubscribeBets();
        };

      } else {
        setUser(null);
        setUserProfile(null);
        setPendingWagered(0);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, pendingWagered }}>
      {children}
    </AuthContext.Provider>
  );
};

// A hook to protect routes
export const useRequireAuth = () => {
    const authContext = useContext(AuthContext);
    const router = useRouter();

    useEffect(() => {
        if (!authContext.loading && !authContext.user) {
            router.push('/login');
        }
    }, [authContext.user, authContext.loading, router]);

    return authContext;
}
