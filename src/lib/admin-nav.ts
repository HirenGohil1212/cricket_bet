
import type { UserPermissions } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  Swords,
  Banknote,
  Wallet,
  CircleDollarSign,
  MessageSquareQuote,
  Gift,
  GalleryHorizontal,
  LineChart,
  Percent,
  UsersRound,
  DatabaseZap,
  Settings,
  UserRoundX,
  SlidersHorizontal,
  Lock,
} from "lucide-react";

export const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: 'canManageDashboard' as keyof UserPermissions },
    { href: "/admin/control-panel", label: "Control Panel", icon: SlidersHorizontal, permission: 'canManageControlPanel' as keyof UserPermissions },
    { href: "/admin/users", label: "Users", icon: Users, permission: 'canManageUsers' as keyof UserPermissions },
    { href: "/admin/matches", label: "Matches", icon: Swords, permission: 'canManageMatches' as keyof UserPermissions },
    { href: "/admin/players", label: "Players", icon: UsersRound, permission: 'canManagePlayers' as keyof UserPermissions },
    { href: "/admin/dummy-users", label: "Dummy Users", icon: UserRoundX, permission: 'canManageDummyUsers' as keyof UserPermissions },
    { href: "/admin/q-and-a", label: "Result", icon: MessageSquareQuote, permission: 'canManageResults' as keyof UserPermissions },
    { href: "/admin/deposits", label: "Deposits", icon: Wallet, permission: 'canManageDeposits' as keyof UserPermissions },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: CircleDollarSign, permission: 'canManageWithdrawals' as keyof UserPermissions },
    { href: "/admin/financial-reports", label: "Financials", icon: LineChart, permission: 'canViewFinancials' as keyof UserPermissions },
    { href: "/admin/referrals", label: "Referrals", icon: Gift, permission: 'canManageReferrals' as keyof UserPermissions },
    { href: "/admin/betting-settings", label: "Betting Settings", icon: Percent, permission: 'canManageBettingSettings' as keyof UserPermissions },
    { href: "/admin/bank-details", label: "Bank Details", icon: Banknote, permission: 'canManageBankDetails' as keyof UserPermissions },
    { href: "/admin/content", label: "Content", icon: GalleryHorizontal, permission: 'canManageContent' as keyof UserPermissions },
    { href: "/admin/data-management", label: "Data Management", icon: DatabaseZap, permission: 'canManageDataManagement' as keyof UserPermissions },
    { href: "/admin/settings", label: "Support", icon: Settings, permission: 'canManageSupport' as keyof UserPermissions },
    { href: "/admin/permissions", label: "Permissions", icon: Lock, permission: 'canManagePermissions' as keyof UserPermissions },
];

// Helper to get the required permission for a given path
export const getPermissionForPath = (path: string): keyof UserPermissions | null => {
    // Find the link that matches the start of the path
    const matchedLink = navLinks.find(link => path.startsWith(link.href));
    return matchedLink ? matchedLink.permission : null;
};
