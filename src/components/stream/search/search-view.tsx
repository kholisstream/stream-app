'use client';

import { useState, useEffect } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

export function SearchView() {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setUsers(data.users || []);
      setSearched(true);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUser: Profile, index: number) => {
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
        body: JSON.stringify({ user_id: targetUser.id }),
      });
      const data = await res.json();

      setUsers((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, is_following: data.following } : u
        )
      );
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  return (
    <div className="pb-16">
      {/* Search bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-9 pr-9 h-10 rounded-full bg-muted border-none focus-visible:ring-stream"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setUsers([]); setSearched(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-stream/30 border-t-stream rounded-full animate-spin" />
        </div>
      ) : searched ? (
        users.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-sm">No users found for &quot;{query}&quot;</p>
          </div>
        ) : (
          <div>
            {users.map((u, index) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate('user-profile', { userId: u.id })}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="bg-stream/10 text-stream text-sm font-semibold">
                    {u.full_name ? u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : u.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.full_name || u.username}</p>
                  <p className="text-muted-foreground text-sm truncate">@{u.username}</p>
                </div>

                {u.id !== user?.id && (
                  <Button
                    className={`rounded-full px-4 h-8 text-xs font-semibold shrink-0 ${
                      u.is_following
                        ? 'bg-transparent border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive'
                        : 'bg-stream hover:bg-stream/90 text-stream-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(u, index);
                    }}
                  >
                    {u.is_following ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="py-20 text-center">
          <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Search for people to follow</p>
        </div>
      )}
    </div>
  );
}
