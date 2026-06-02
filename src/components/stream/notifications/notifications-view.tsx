'use client';

import { useState, useEffect } from 'react';
import { Heart, Repeat2, UserPlus, MessageCircle, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';

export function NotificationsView() {
  const navigate = useAppStore((s) => s.navigate);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'repost':
        return <Repeat2 className="w-4 h-4 text-stream" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-stream" />;
      case 'reply':
        return <MessageCircle className="w-4 h-4 text-stream" />;
    }
  };

  const getText = (n: Notification) => {
    const name = n.actor?.full_name || n.actor?.username || 'Someone';
    switch (n.type) {
      case 'like':
        return <><strong>{name}</strong> liked your post</>;
      case 'repost':
        return <><strong>{name}</strong> reposted your post</>;
      case 'follow':
        return <><strong>{name}</strong> followed you</>;
      case 'reply':
        return <><strong>{name}</strong> replied to your post</>;
    }
  };

  const handleClick = (n: Notification) => {
    if (n.type === 'follow') {
      navigate('user-profile', { userId: n.actor_id });
    } else if (n.post_id) {
      navigate('thread', { threadId: n.post_id });
    }
  };

  const hasUnread = notifications.some((n) => !n.read);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 pb-20">
        <div className="w-8 h-8 border-2 border-stream/30 border-t-stream rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
          <h1 className="text-xl font-bold">Activity</h1>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-stream text-xs font-semibold"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="py-20 text-center">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No activity yet</p>
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full flex items-start gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors text-left ${
                !n.read ? 'bg-stream/5' : ''
              }`}
            >
              {/* Icon */}
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={n.actor?.avatar_url || undefined} />
                    <AvatarFallback className="bg-stream/10 text-stream text-xs font-semibold">
                      {n.actor?.full_name
                        ? n.actor.full_name.split(' ').map((x) => x[0]).join('').toUpperCase().slice(0, 2)
                        : n.actor?.username?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm leading-relaxed">{getText(n)}</p>
                </div>

                {n.post && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {n.post.content}
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-0.5">
                  {getTimeAgo(n.created_at)}
                </p>
              </div>

              {/* Unread dot */}
              {!n.read && (
                <div className="w-2 h-2 rounded-full bg-stream shrink-0 mt-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Bell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
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

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
