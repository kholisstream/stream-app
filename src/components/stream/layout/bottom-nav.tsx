'use client';

import { Home, Search, Bell, User, Plus } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import type { ViewType } from '@/types';

const navItems: { view: ViewType; icon: typeof Home; label: string }[] = [
  { view: 'home', icon: Home, label: 'Home' },
  { view: 'search', icon: Search, label: 'Search' },
  { view: 'compose', icon: Plus, label: 'Post' },
  { view: 'notifications', icon: Bell, label: 'Activity' },
  { view: 'profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const currentView = useAppStore((s) => s.currentView);
  const navigate = useAppStore((s) => s.navigate);
  const setComposeOpen = useAppStore((s) => s.setComposeOpen);
  const user = useAppStore((s) => s.user);

  const handleNav = (view: ViewType) => {
    if (view === 'compose') {
      setComposeOpen(true);
      return;
    }
    if (view === 'profile') {
      navigate('profile', { userId: user?.id });
      return;
    }
    navigate(view);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        {navItems.map(({ view, icon: Icon, label }) => {
          const isActive = view === 'compose' ? false : currentView === view;
          return (
            <button
              key={view}
              onClick={() => handleNav(view)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all active:scale-90 ${
                view === 'compose'
                  ? 'text-stream'
                  : isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
              aria-label={label}
            >
              {view === 'compose' ? (
                <div className="w-9 h-9 rounded-full bg-stream flex items-center justify-center">
                  <Icon className="w-5 h-5 text-stream-foreground" strokeWidth={2.5} />
                </div>
              ) : (
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 1.5} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
