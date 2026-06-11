'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, Trophy, LogOut, Shield, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { LiveMatchesWidget } from '@/components/live-matches-widget';

type NavItem = { href: string; label: string; icon: React.ElementType };

const BASE_NAV: NavItem[] = [
  { href: '/', label: 'Mis Quinielas', icon: Home },
  { href: '/torneos', label: 'Torneos', icon: Trophy },
];

function isNavActive(href: string, pathname: string): boolean {
  // /torneos/[slug]/admin belongs to the /admin section, not /torneos
  const inAdminSection = pathname === '/admin' || pathname.includes('/admin');
  if (href === '/admin') return inAdminSection;
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href) && !inAdminSection;
}

function NavLink({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const active = isNavActive(href, pathname);
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { bgUrl } = useSiteConfig();

  const navItems: NavItem[] = [
    ...BASE_NAV,
    ...(user?.is_admin ? [{ href: '/admin', label: 'Super Admin', icon: Shield }] : []),
  ];

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    // useEffect redirects to /login once user becomes null
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Skeleton className="h-8 w-32 bg-slate-800" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className={cn('min-h-screen flex', !bgUrl && 'bg-slate-950')}
      style={bgUrl ? {
        backgroundImage: `linear-gradient(rgba(2,6,23,0.74), rgba(2,6,23,0.74)), url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      } : undefined}
    >
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">
            Match<span className="text-emerald-400">Pick</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Mundial 2026</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <Separator className="bg-slate-700 my-4" />

        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="bg-slate-700 text-white text-xs">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            {user.is_admin && (
              <p className="text-[10px] text-emerald-500 font-medium">Super Admin</p>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Link href="/perfil">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white h-8 w-8" title="Editar perfil">
                <UserCircle className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <h1 className="text-lg font-bold text-white">
            Match<span className="text-emerald-400">Pick</span>
          </h1>
          <div className="flex items-center gap-2">
            {user.is_admin && (
              <Link
                href="/admin"
                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                <Shield className="h-4 w-4" />
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus:outline-none">
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-slate-700 text-white text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-slate-900 border-slate-800 text-slate-200 min-w-44"
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  onClick={() => router.push('/perfil')}
                  className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
                >
                  <UserCircle className="h-4 w-4 text-slate-400" />
                  Editar perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 cursor-pointer text-red-400 hover:bg-red-950/40 focus:bg-red-950/40 hover:text-red-300 focus:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Live matches floating widget */}
      <LiveMatchesWidget />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex z-50">
        {navItems.map(({ href, label, icon: Icon }) => (
          <MobileNavLink key={href} href={href} label={label} Icon={Icon} />
        ))}
      </nav>
    </div>
  );
}

function MobileNavLink({ href, label, Icon }: { href: string; label: string; Icon: React.ElementType }) {
  const pathname = usePathname();
  const active = isNavActive(href, pathname);
  return (
    <Link
      href={href}
      className={cn(
        'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
        active ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px]">{label}</span>
    </Link>
  );
}
