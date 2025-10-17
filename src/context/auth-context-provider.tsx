
'use client';

import { useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        const userDocRef = doc(db, 'users', authUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const profile: UserProfile = {
                    uid: doc.id,
                    name: data.name,
                    phoneNumber: data.phoneNumber,
                    walletBalance: data.walletBalance,
                    referralCode: data.referralCode,
                    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                    role: data.role,
                    bankAccount: data.bankAccount || undefined,
                    referredBy: data.referredBy,
                    isFirstBetPlaced: data.isFirstBetPlaced,
                    referralBonusAwarded: data.referralBonusAwarded,
                };
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// A hook to protect routes
export const useRequireAuth = () => {
    const { user, loading } = useContext(AuthContext);
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    return { user, loading };
}
