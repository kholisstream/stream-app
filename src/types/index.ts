export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  follower_count?: number;
  following_count?: number;
  post_count?: number;
  is_following?: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: Profile;
  // Stats
  like_count: number;
  repost_count: number;
  reply_count: number;
  // User interaction state
  is_liked: boolean;
  is_reposted: boolean;
  // Replies (for thread view)
  replies?: Post[];
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'repost' | 'follow' | 'reply';
  post_id: string | null;
  read: boolean;
  created_at: string;
  // Joined
  actor?: Profile;
  post?: Post;
}

export type ViewType =
  | 'home'
  | 'search'
  | 'notifications'
  | 'profile'
  | 'thread'
  | 'user-profile'
  | 'settings'
  | 'edit-profile';

export interface NavigationState {
  currentView: ViewType;
  threadId: string | null;
  userId: string | null;
  navigate: (view: ViewType, data?: { threadId?: string; userId?: string }) => void;
  goBack: () => void;
  history: Array<{ view: ViewType; threadId?: string; userId?: string }>;
}
