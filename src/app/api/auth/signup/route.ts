import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username, full_name } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if username is taken
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Create auth user
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, full_name: full_name || '' },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Wait briefly for trigger to create profile, then fetch it
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return NextResponse.json({ user: data.user, profile }, { status: 201 });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
