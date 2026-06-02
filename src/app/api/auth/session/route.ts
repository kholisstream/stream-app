import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const adminClient = createAdminClient();

    const { data: { user }, error } = await adminClient.auth.admin.getUserByToken(
      token.replace('Bearer ', '')
    );

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ user, profile });
  } catch (err) {
    console.error('Session error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
