'use client';

import { useState, useEffect } from 'react';
import { AuthView } from '@/components/stream/auth/auth-view';
import { AppShell } from '@/components/stream/layout/app-shell';

function SetupGuide() {
  const [copied, setCopied] = useState(false);

  const copySchema = () => {
    const schemaUrl = window.location.origin + '/supabase-schema.sql';
    navigator.clipboard.writeText('Run the SQL schema in your Supabase SQL Editor. See supabase/schema.sql in the project.');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        Stream needs a Supabase project to work. Follow these steps to get started:
      </p>

      <div className="w-full max-w-md space-y-4">
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-6 h-6 rounded-full bg-stream text-stream-foreground text-xs font-bold flex items-center justify-center">1</span>
            <h3 className="font-semibold text-sm">Create Supabase Project</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            Go to <a href="https://supabase.com" target="_blank" rel="noopener" className="text-stream underline">supabase.com</a> and create a new project.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-6 h-6 rounded-full bg-stream text-stream-foreground text-xs font-bold flex items-center justify-center">2</span>
            <h3 className="font-semibold text-sm">Run Database Schema</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            Go to SQL Editor in your Supabase dashboard and run the schema from <code className="bg-muted px-1 rounded">supabase/schema.sql</code>
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-6 h-6 rounded-full bg-stream text-stream-foreground text-xs font-bold flex items-center justify-center">3</span>
            <h3 className="font-semibold text-sm">Set Environment Variables</h3>
          </div>
          <div className="ml-9 space-y-1.5 text-xs font-mono">
            <div className="bg-muted px-2 py-1 rounded">NEXT_PUBLIC_SUPABASE_URL=<span className="text-stream">your-url</span></div>
            <div className="bg-muted px-2 py-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY=<span className="text-stream">your-key</span></div>
            <div className="bg-muted px-2 py-1 rounded">SUPABASE_SERVICE_ROLE_KEY=<span className="text-stream">your-role-key</span></div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-6 h-6 rounded-full bg-stream text-stream-foreground text-xs font-bold flex items-center justify-center">4</span>
            <h3 className="font-semibold text-sm">Deploy to Vercel</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            Push to GitHub and import in Vercel. Set the same environment variables in your Vercel project settings.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        Restart the dev server after setting environment variables.
      </p>
    </div>
  );
}

export function StreamApp() {
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);

  useEffect(() => {
    // Check if Supabase is configured
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key || url === 'your_supabase_url_here') {
      setSetupNeeded(true);
      setLoading(false);
      return;
    }

    setSupabaseConfigured(true);

    // Import and initialize auth
    const initAuth = async () => {
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

        // Listen for auth changes
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
    };

    initAuth();
  }, []);

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

  if (setupNeeded) {
    return <SetupGuide />;
  }

  if (!user) {
    return <AuthView />;
  }

  return <AppShell />;
}
