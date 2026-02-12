'use client';

import { Home, FolderOpen, Plus, FileText, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { MobileNavigationDrawer } from './MobileNavigationDrawer';

export function BottomNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border z-40 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          <Link
            href="/dashboard"
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full space-y-1 text-xs font-medium transition-colors',
              pathname === '/dashboard'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          <Link
            href="/projects"
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full space-y-1 text-xs font-medium transition-colors',
              pathname === '/projects' || pathname.startsWith('/projects/')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FolderOpen className="h-5 w-5" />
            <span>Projects</span>
          </Link>

          {/* Center FAB */}
          <div className="w-16 h-full flex items-center justify-center relative -top-5">
            <div className="absolute rounded-full bg-background p-1.5">
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                onClick={() => router.push('/projects?new=true')}
                aria-label="Create new project"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <Link
            href="/documents"
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full space-y-1 text-xs font-medium transition-colors',
              pathname === '/documents' || pathname.startsWith('/documents/')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileText className="h-5 w-5" />
            <span>Docs</span>
          </Link>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-16 h-full space-y-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
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
