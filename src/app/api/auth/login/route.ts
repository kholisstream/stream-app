import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify user exists by listing and checking
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = usersData.users.find(u => u.email === email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Try to sign in with password using the admin client
    // We need to verify the password - create a temporary client for this
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return NextResponse.json({
      user: authData.user,
      session: authData.session,
      profile,
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
