'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Post } from '@/types';

export function ComposeSheet() {
  const composeOpen = useAppStore((s) => s.composeOpen);
  const setComposeOpen = useAppStore((s) => s.setComposeOpen);
  const replyToPostId = useAppStore((s) => s.replyToPostId);
  const setReplyToPostId = useAppStore((s) => s.setReplyToPostId);
  const user = useAppStore((s) => s.user);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  if (!composeOpen) return null;

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || '??';

  const charLimit = 500;
  const remaining = charLimit - content.length;

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          parent_id: replyToPostId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post');
      }

      setContent('');
      setComposeOpen(false);
      setReplyToPostId(null);
      // Refresh feed
      window.dispatchEvent(new CustomEvent('stream-refresh'));
    } catch (err: any) {
      alert(err.message || 'Failed to post');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setComposeOpen(false);
    setReplyToPostId(null);
    setContent('');
  };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-0">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || remaining < 0 || loading}
            className="bg-stream hover:bg-stream/90 text-stream-foreground font-semibold rounded-full px-5 h-9"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : replyToPostId ? 'Reply' : 'Post'}
          </Button>
        </div>

        {/* Reply indicator */}
        {replyToPostId && (
          <div className="px-4 pb-2">
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              Replying to post
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex gap-3 px-4 pb-4 flex-1 overflow-y-auto">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback className="bg-stream/10 text-stream text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={replyToPostId ? 'Write a reply...' : 'Start a thread...'}
            className="flex-1 bg-transparent resize-none text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none min-h-[120px]"
            autoFocus
            maxLength={charLimit + 50}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-border">
          <div className="flex gap-2">
            {/* Could add image/gif buttons here */}
          </div>
          <span className={`text-xs ${remaining < 0 ? 'text-destructive' : remaining < 50 ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {remaining}
          </span>
        </div>
      </div>
    </div>
  );
}
