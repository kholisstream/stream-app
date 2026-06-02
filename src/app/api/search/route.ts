import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const adminClient = createAdminClient();

    let currentUserId: string | null = null;
    if (token) {
      const { data: { user } } = await adminClient.auth.admin.getUserByToken(token);
      currentUserId = user?.id ?? null;
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Search by username or full_name
    const { data: users, error } = await adminClient
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Enrich with follow status
    const enrichedUsers = await Promise.all(
      (users || []).map(async (u) => {
        let is_following = false;
        if (currentUserId && currentUserId !== u.id) {
          const { data: follow } = await adminClient
            .from('follows')
            .select('id')
            .eq('follower_id', currentUserId)
            .eq('following_id', u.id)
            .single();
          is_following = !!follow;
        }

        const { count: follower_count } = await adminClient
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', u.id);

        return {
          ...u,
          is_following,
          follower_count: follower_count || 0,
        };
      })
    );

    return NextResponse.json({ users: enrichedUsers });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
