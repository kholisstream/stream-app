'use client';

import { useState } from 'react';
import { ArrowLeft, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/app-store';
import { getSupabaseClient } from '@/lib/supabase/client';

export function SettingsView() {
  const navigate = useAppStore((s) => s.navigate);
  const goBack = useAppStore((s) => s.goBack);
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto flex items-center h-12 px-4">
          <button onClick={goBack} className="mr-3 p-1 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        <button
          onClick={() => navigate('edit-profile')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted transition-colors"
        >
          <span className="text-sm font-medium">Edit Profile</span>
          <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
        >
          <span className="text-sm font-medium">Log Out</span>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function EditProfileView() {
  const goBack = useAppStore((s) => s.goBack);
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const [username, setUsername] = useState(user?.username || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
          full_name: fullName,
          bio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setUser(data.profile);
      goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between h-12 px-4">
          <button onClick={goBack} className="p-1 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Edit Profile</h1>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-stream hover:bg-stream/90 text-stream-foreground font-semibold rounded-full px-4 h-8 text-sm"
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5">
        {error && (
          <div className="text-destructive text-sm text-center bg-destructive/10 rounded-lg p-2">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="edit-username">Username</Label>
          <Input
            id="edit-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-name">Full Name</Label>
          <Input
            id="edit-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-bio">Bio</Label>
          <Textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={160}
            className="rounded-xl resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/160</p>
        </div>
      </div>
    </div>
  );
}
