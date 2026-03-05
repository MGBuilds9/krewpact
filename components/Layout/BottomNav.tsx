'use client';

import { Home, FolderOpen, Plus, FileText, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { MobileNavigationDrawer } from './MobileNavigationDrawer';

export function BottomNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { push: orgPush, orgPath } = useOrgRouter();

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 supports-[backdrop-filter]:bg-background/80 backdrop-blur-2xl border-t shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)] z-40 pb-safe">
        <div className="flex items-center justify-between px-4 h-20">
          <Link
            href={orgPath('/dashboard')}
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full space-y-1.5 font-semibold transition-all duration-200 active:scale-95',
              pathname.endsWith('/dashboard')
                ? 'text-primary scale-105'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Home className="h-6 w-6" />
            <span className="text-[10px] tracking-wider uppercase">Home</span>
          </Link>

          <Link
            href={orgPath('/projects')}
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full space-y-1.5 font-semibold transition-all duration-200 active:scale-95',
              pathname.includes('/projects')
                ? 'text-primary scale-105'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FolderOpen className="h-6 w-6" />
            <span className="text-[10px] tracking-wider uppercase">Projects</span>
          </Link>

          {/* Center FAB - Massive target */}
          <div className="w-16 h-full flex items-center justify-center relative -top-6">
            <div className="absolute rounded-full bg-background p-2 shadow-sm">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_8px_16px_-4px_rgba(249,115,22,0.4)] hover:bg-primary/90 transition-transform duration-200 active:scale-90"
                onClick={() => orgPush('/projects?new=true')}
                aria-label="Create new project"
              >
                <Plus className="h-7 w-7" />
              </Button>
            </div>
          </div>

          <Link
            href={orgPath('/documents')}
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full space-y-1.5 font-semibold transition-all duration-200 active:scale-95',
              pathname.includes('/documents')
                ? 'text-primary scale-105'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileText className="h-6 w-6" />
            <span className="text-[10px] tracking-wider uppercase">Docs</span>
          </Link>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-16 h-full space-y-1.5 font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
          >
            <Menu className="h-6 w-6" />
            <span className="text-[10px] tracking-wider uppercase">Menu</span>
          </button>
        </div>
      </div>

      <MobileNavigationDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
