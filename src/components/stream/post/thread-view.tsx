'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PostCard } from '@/components/stream/post/post-card';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/app-store';
import type { Post } from '@/types';

export function ThreadView() {
  const threadId = useAppStore((s) => s.threadId);
  const goBack = useAppStore((s) => s.goBack);
  const [post, setPost] = useState<Post | null>(null);
  const [parents, setParents] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) return;

    const fetchThread = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';

        const res = await fetch(`/api/feed?post_id=${threadId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.post) {
          setPost(data.post);
          setParents(data.parents || []);
          setReplies(data.replies || []);
        }
      } catch (err) {
        console.error('Failed to fetch thread:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchThread();
  }, [threadId]);

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
        <div className="max-w-lg mx-auto flex items-center h-12 px-4">
          <button
            onClick={goBack}
            className="mr-3 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Thread</h1>
        </div>
      </div>

      {/* Parent posts */}
      {parents.map((p) => (
        <PostCard key={p.id} post={p} compact />
      ))}

      {/* Main post */}
      {post && <PostCard post={post} />}

      {/* Replies */}
      {replies.length > 0 && (
        <div>
          <div className="px-4 py-3 text-sm font-semibold text-muted-foreground border-b border-border">
            Replies
          </div>
          {replies.map((r) => (
            <PostCard key={r.id} post={r} />
          ))}
        </div>
      )}

      {replies.length === 0 && post && (
        <div className="py-10 text-center text-muted-foreground text-sm">
          No replies yet. Be the first!
        </div>
      )}
    </div>
  );
}
