'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Repeat2, MoreHorizontal, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/app-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
  compact?: boolean;
}

export function PostCard({ post, compact = false }: PostCardProps) {
  const navigate = useAppStore((s) => s.navigate);
  const setComposeOpen = useAppStore((s) => s.setComposeOpen);
  const setReplyToPostId = useAppStore((s) => s.setReplyToPostId);
  const user = useAppStore((s) => s.user);
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isReposted, setIsReposted] = useState(post.is_reposted);
  const [repostCount, setRepostCount] = useState(post.repost_count);
  const [showMenu, setShowMenu] = useState(false);

  const initials = post.profile?.full_name
    ? post.profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : post.profile?.username?.slice(0, 2).toUpperCase() || '??';

  const timeAgo = getTimeAgo(post.created_at);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const newState = !isLiked;
    setIsLiked(newState);
    setLikeCount((c) => newState ? c + 1 : Math.max(0, c - 1));

    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ post_id: post.id }),
      });
      const data = await res.json();
      if (data.liked !== newState) {
        setIsLiked(data.liked);
        setLikeCount((c) => data.liked ? c + 1 : Math.max(0, c - 1));
      }
    } catch {
      setIsLiked(!newState);
      setLikeCount((c) => !newState ? c + 1 : Math.max(0, c - 1));
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const newState = !isReposted;
    setIsReposted(newState);
    setRepostCount((c) => newState ? c + 1 : Math.max(0, c - 1));

    try {
      const res = await fetch('/api/repost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ post_id: post.id }),
      });
      const data = await res.json();
      if (data.reposted !== newState) {
        setIsReposted(data.reposted);
        setRepostCount((c) => data.reposted ? c + 1 : Math.max(0, c - 1));
      }
    } catch {
      setIsReposted(!newState);
      setRepostCount((c) => !newState ? c + 1 : Math.max(0, c - 1));
    }
  };

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReplyToPostId(post.id);
    setComposeOpen(true);
  };

  const handleDelete = async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await fetch('/api/posts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ post_id: post.id }),
      });
      window.location.reload();
    } catch {
      // silently fail
    }
  };

  const openThread = () => {
    navigate('thread', { threadId: post.id });
  };

  const openProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('user-profile', { userId: post.user_id });
  };

  return (
    <article className="px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={openThread}>
      <div className="flex gap-3">
        {/* Avatar */}
        <button onClick={openProfile} className="shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-stream/10 text-stream text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5">
            <button onClick={openProfile} className="font-semibold text-sm hover:underline truncate">
              {post.profile?.full_name || post.profile?.username}
            </button>
            <span className="text-muted-foreground text-sm truncate">@{post.profile?.username}</span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm shrink-0">{timeAgo}</span>

            {/* More menu */}
            {user?.id === post.user_id && (
              <div className="relative ml-auto">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-popover border border-border rounded-xl shadow-lg py-1 z-50 animate-fade-in">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(); setShowMenu(false); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted w-full"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Post text */}
          <p className="text-sm leading-relaxed mt-0.5 whitespace-pre-wrap break-words">{post.content}</p>

          {/* Actions */}
          {!compact && (
            <div className="flex items-center gap-6 mt-2 -ml-2">
              {/* Reply */}
              <button
                onClick={handleReply}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-stream transition-colors group"
              >
                <div className="p-1.5 rounded-full group-hover:bg-stream/10 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </div>
                {post.reply_count > 0 && (
                  <span className="text-xs">{post.reply_count}</span>
                )}
              </button>

              {/* Repost */}
              <button
                onClick={handleRepost}
                className={`flex items-center gap-1.5 transition-colors group ${
                  isReposted ? 'text-stream' : 'text-muted-foreground hover:text-stream'
                }`}
              >
                <div className="p-1.5 rounded-full group-hover:bg-stream/10 transition-colors">
                  <Repeat2 className="w-4 h-4" />
                </div>
                {repostCount > 0 && (
                  <span className="text-xs">{repostCount}</span>
                )}
              </button>

              {/* Like */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 transition-colors group ${
                  isLiked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'
                }`}
              >
                <div className="p-1.5 rounded-full group-hover:bg-rose-500/10 transition-colors">
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                </div>
                {likeCount > 0 && (
                  <span className="text-xs">{likeCount}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
