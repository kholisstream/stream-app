import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// One-time setup endpoint - runs the database schema
export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const results: { step: string; status: string; error?: string }[] = [];

    // Step 1: Create profiles table
    const { error: e1 } = await adminClient
      .from('profiles')
      .select('id')
      .limit(1);

    if (e1 && e1.code === '42P01') {
      // Table doesn't exist - but we can't create it via REST API
      results.push({ step: 'profiles', status: 'needs_sql', error: 'Table does not exist - run SQL schema first' });
    } else {
      results.push({ step: 'profiles', status: 'exists' });
    }

    // Check other tables
    const tables = ['posts', 'likes', 'reposts', 'follows', 'notifications'];
    for (const table of tables) {
      const { error } = await adminClient.from(table).select('id').limit(1);
      if (error && error.code === '42P01') {
        results.push({ step: table, status: 'needs_sql', error: 'Table does not exist' });
      } else {
        results.push({ step: table, status: 'exists' });
      }
    }

    const needsSetup = results.some(r => r.status === 'needs_sql');

    return NextResponse.json({
      ready: !needsSetup,
      results,
      message: needsSetup
        ? 'Database schema not yet applied. Run the SQL schema in Supabase SQL Editor.'
        : 'All tables exist! Database is ready.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
