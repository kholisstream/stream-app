'use client';

import { useAppStore } from '@/store/app-store';
import { BottomNav } from '@/components/stream/layout/bottom-nav';

import { HomeView } from '@/components/stream/feed/home-view';
import { SearchView } from '@/components/stream/search/search-view';
import { NotificationsView } from '@/components/stream/notifications/notifications-view';
import { ProfileView } from '@/components/stream/profile/profile-view';
import { ThreadView } from '@/components/stream/post/thread-view';
import { ComposeSheet } from '@/components/stream/compose/compose-sheet';
import { SettingsView, EditProfileView } from '@/components/stream/settings/settings-view';

export function AppShell() {
  const currentView = useAppStore((s) => s.currentView);

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'search':
        return <SearchView />;
      case 'notifications':
        return <NotificationsView />;
      case 'profile':
      case 'user-profile':
        return <ProfileView />;
      case 'thread':
        return <ThreadView />;
      case 'settings':
        return <SettingsView />;
      case 'edit-profile':
        return <EditProfileView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 max-w-lg mx-auto w-full">
        {renderView()}
      </main>

      <BottomNav />
      <ComposeSheet />
    </div>
  );
}
