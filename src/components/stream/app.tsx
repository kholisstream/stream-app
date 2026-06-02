'use client';

import { useState, useEffect } from 'react';
import { AuthView } from '@/components/stream/auth/auth-view';
import { AppShell } from '@/components/stream/layout/app-shell';

export function StreamApp() {
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key || url === 'your_supabase_url_here') {
      setSetupNeeded(true);
      setLoading(false);
      return;
    }

    setSupabaseReady(true);
    initAuth();
  }, []);

  async function initAuth() {
    try {
      const { getSupabaseClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseClient();

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(profile);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            setUser(profile);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        }
      );

      setLoading(false);
      return () => subscription.unsubscribe();
    } catch (err) {
      console.error('Auth init error:', err);
      setSetupNeeded(true);
      setLoading(false);
    }
  }

  async function handleAutoSetup() {
    setSetupLoading(true);
    setSetupError('');

    try {
      const res = await fetch('/api/setup-db', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer stream-setup-key',
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Setup failed');
      }

      if (data.success) {
        // Database is ready, reload the app
        window.location.reload();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setSetupError(err.message);
    } finally {
      setSetupLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-16 h-16 rounded-2xl bg-stream flex items-center justify-center mb-4 animate-pulse">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
            <path d="M22 2L13 11" />
            <path d="M16 2h6v6" />
          </svg>
        </div>
        <div className="w-8 h-8 border-2 border-stream/30 border-t-stream rounded-full animate-spin" />
      </div>
    );
  }

  if (setupNeeded && !supabaseReady) {
    return <SetupGuide />;
  }

  if (!user) {
    return <AuthView />;
  }

  return <AppShell />;
}

function SetupGuide() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-stream/10 flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stream">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
          <path d="M22 2L13 11" />
          <path d="M16 2h6v6" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2">Setup Required</h1>
      <p className="text-muted-foreground text-sm text-center max-w-sm mb-8">
        Run the SQL schema in your Supabase SQL Editor to create the database tables.
      </p>
      <div className="w-full max-w-md space-y-4">
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-6 h-6 rounded-full bg-stream text-stream-foreground text-xs font-bold flex items-center justify-center">1</span>
            <h3 className="font-semibold text-sm">Open Supabase SQL Editor</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            Go to your Supabase Dashboard → SQL Editor → New Query
          </p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-6 h-6 rounded-full bg-stream text-stream-foreground text-xs font-bold flex items-center justify-center">2</span>
            <h3 className="font-semibold text-sm">Copy & Run the Schema</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            Copy the SQL from <code className="bg-muted px-1 rounded">supabase/schema.sql</code> in the GitHub repo and run it.
          </p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-6 h-6 rounded-full bg-stream text-stream-foreground text-xs font-bold flex items-center justify-center">3</span>
            <h3 className="font-semibold text-sm">Refresh This Page</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            After running the SQL, refresh this page. The app will be ready!
          </p>
        </div>
      </div>
      <a
        href="https://github.com/kholisstream/stream-app/blob/main/supabase/schema.sql"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 bg-stream hover:bg-stream/90 text-stream-foreground font-semibold rounded-full px-6 h-10 flex items-center text-sm"
      >
        View Schema on GitHub →
      </a>
    </div>
  );
}
