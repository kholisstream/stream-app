'use client';

import { ArrowLeft, Settings } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import type { ViewType } from '@/types';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showSettings?: boolean;
  onSettingsClick?: () => void;
}

const viewTitles: Record<ViewType, string> = {
  home: 'Stream',
  search: 'Search',
  notifications: 'Activity',
  profile: 'Profile',
  thread: 'Thread',
  'user-profile': 'Profile',
  settings: 'Settings',
  'edit-profile': 'Edit Profile',
  compose: 'New Post',
};

export function Header({ title, showBack, showSettings, onSettingsClick }: HeaderProps) {
  const goBack = useAppStore((s) => s.goBack);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-lg mx-auto flex items-center h-12 px-4">
        {showBack && (
          <button
            onClick={goBack}
            className="mr-3 p-1 rounded-full hover:bg-muted transition-colors active:scale-90"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-bold flex-1">{title}</h1>
        {showSettings && (
          <button
            onClick={onSettingsClick}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}

export function getViewTitle(view: ViewType): string {
  return viewTitles[view] || 'Stream';
}
