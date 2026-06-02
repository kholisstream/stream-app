'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, ArrowLeft, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/stream/post/post-card';
import { useAppStore } from '@/store/app-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Profile, Post } from '@/types';

export function ProfileView() {
  const userId = useAppStore((s) => s.userId);
  const user = useAppStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);
  const goBack = useAppStore((s) => s.goBack);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const targetUserId = userId || user?.id;
  const isOwnProfile = targetUserId === user?.id;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/profiles?user_id=${targetUserId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setIsFollowing(data.profile.is_following || false);
      }

      // Fetch posts
      const postsRes = await fetch(`/api/feed?user_id=${targetUserId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const postsData = await postsRes.json();
      if (postsData.posts) {
        setPosts(postsData.posts.filter((p: Post) => !p.parent_id));
        setReplies(postsData.posts.filter((p: Post) => p.parent_id));
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);

    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: profile.id }),
      });
      const data = await res.json();
      setIsFollowing(data.following);
      setProfile((prev) => prev ? {
        ...prev,
        follower_count: data.following ? (prev.follower_count || 0) + 1 : Math.max(0, (prev.follower_count || 0) - 1),
      } : prev);
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 pb-20">
        <div className="w-8 h-8 border-2 border-stream/30 border-t-stream rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center pb-20">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.username.slice(0, 2).toUpperCase();

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto flex items-center h-12 px-4">
          {!isOwnProfile && (
            <button onClick={goBack} className="mr-3 p-1 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg font-bold flex-1">{profile.username}</h1>
          {isOwnProfile && (
            <button
              onClick={() => navigate('settings')}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Profile info */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-stream/10 text-stream text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {isOwnProfile ? (
            <Button
              variant="outline"
              className="rounded-full px-5 h-9 text-sm font-semibold"
              onClick={() => navigate('edit-profile')}
            >
              Edit Profile
            </Button>
          ) : (
            <Button
              className={`rounded-full px-5 h-9 text-sm font-semibold ${
                isFollowing
                  ? 'bg-transparent border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive'
                  : 'bg-stream hover:bg-stream/90 text-stream-foreground'
              }`}
              onClick={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>

        <div className="mt-3">
          <h2 className="font-bold text-lg">{profile.full_name}</h2>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="text-sm mt-2 whitespace-pre-wrap">{profile.bio}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Joined {joinDate}</span>
          </div>
        </div>

        <div className="flex gap-4 mt-3 text-sm">
          <span>
            <strong className="text-foreground">{profile.following_count || 0}</strong>{' '}
            <span className="text-muted-foreground">following</span>
          </span>
          <span>
            <strong className="text-foreground">{profile.follower_count || 0}</strong>{' '}
            <span className="text-muted-foreground">followers</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-around bg-transparent border-b border-border h-11 rounded-none p-0">
          <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-stream data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1">
            Posts
          </TabsTrigger>
          <TabsTrigger value="replies" className="rounded-none border-b-2 border-transparent data-[state=active]:border-stream data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1">
            Replies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          {posts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No posts yet
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </TabsContent>

        <TabsContent value="replies" className="mt-0">
          {replies.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No replies yet
            </div>
          ) : (
            replies.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
