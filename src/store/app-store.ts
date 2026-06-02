import { create } from 'zustand';
import type { ViewType, NavigationState, Profile } from '@/types';

interface AppState extends NavigationState {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  composeOpen: boolean;
  setComposeOpen: (open: boolean) => void;
  replyToPostId: string | null;
  setReplyToPostId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'home',
  threadId: null,
  userId: null,
  user: null,
  composeOpen: false,
  replyToPostId: null,
  history: [],

  setUser: (user) => set({ user }),

  setComposeOpen: (open) => set({ composeOpen: open }),

  setReplyToPostId: (id) => set({ replyToPostId: id }),

  navigate: (view, data) => {
    const current = get();
    set({
      history: [
        ...current.history,
        { view: current.currentView, threadId: current.threadId ?? undefined, userId: current.userId ?? undefined },
      ],
      currentView: view,
      threadId: data?.threadId ?? null,
      userId: data?.userId ?? null,
    });
  },

  goBack: () => {
    const history = get().history;
    if (history.length > 0) {
      const prev = history[history.length - 1];
      set({
        history: history.slice(0, -1),
        currentView: prev.view,
        threadId: prev.threadId ?? null,
        userId: prev.userId ?? null,
      });
    } else {
      set({ currentView: 'home', threadId: null, userId: null });
    }
  },
}));
