'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { PostCard } from '@/components/stream/post/post-card';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Post } from '@/types';

export function HomeView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/feed', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchFeed();
    };
    window.addEventListener('stream-refresh', handleRefresh);
    return () => window.removeEventListener('stream-refresh', handleRefresh);
  }, [fetchFeed]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-stream/30 border-t-stream rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm mt-3">Loading your stream...</p>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Refresh button */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
          <h1 className="text-xl font-bold">Stream</h1>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full hover:bg-muted transition-colors active:scale-90"
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 rounded-full bg-stream/10 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stream">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
              <path d="M22 2L13 11" />
              <path d="M16 2h6v6" />
            </svg>
          </div>
          <h2 className="font-semibold text-lg mb-1">Your stream is empty</h2>
          <p className="text-muted-foreground text-sm text-center">
            Follow people to see their posts here, or create your first thread!
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
