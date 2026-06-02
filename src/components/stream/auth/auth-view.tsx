'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/app-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setUser = useAppStore((s) => s.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseClient();

      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        setUser(profile as Profile);
      } else {
        // Signup
        if (username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              full_name: fullName,
            },
          },
        });

        if (authError) throw authError;

        if (data.user) {
          // Wait for profile creation trigger
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          setUser(profile as Profile);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-stream flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
            <path d="M22 2L13 11" />
            <path d="M16 2h6v6" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Stream</h1>
        <p className="text-muted-foreground mt-1 text-sm">Say it. Share it. Stream it.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {!isLogin && (
          <>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-11"
          />
        </div>

        {error && (
          <div className="text-destructive text-sm text-center bg-destructive/10 rounded-lg p-2">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 bg-stream hover:bg-stream/90 text-stream-foreground font-semibold rounded-xl"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isLogin ? 'Signing in...' : 'Creating account...'}
            </div>
          ) : (
            isLogin ? 'Sign In' : 'Create Account'
          )}
        </Button>
      </form>

      {/* Toggle */}
      <button
        onClick={() => {
          setIsLogin(!isLogin);
          setError('');
        }}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <span className="text-stream font-semibold">
          {isLogin ? 'Sign Up' : 'Sign In'}
        </span>
      </button>
    </div>
  );
}
