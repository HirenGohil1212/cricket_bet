import { db } from '@/lib/firebase';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData, Timestamp, orderBy, query } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

async function getUsers(): Promise<UserProfile[]> {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('createdAt', 'desc'));
    const userSnapshot = await getDocs(q);
    const userList = userSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        return {
            uid: doc.id,
            name: data.name,
            phoneNumber: data.phoneNumber,
            walletBalance: data.walletBalance,
            referralCode: data.referralCode,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            role: data.role || 'user',
        } as UserProfile;
    });
    return userList;
}

export default async function AdminUsersPage() {
    const users = await getUsers();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>A list of all the users in your app.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Wallet Balance</TableHead>
                            <TableHead>Referral Code</TableHead>
                            <TableHead>Joined On</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.phoneNumber}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">₹{user.walletBalance.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{user.referralCode}</Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
