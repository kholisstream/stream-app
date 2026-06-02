import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await adminClient.auth.admin.getUserByToken(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id: targetUserId } = await request.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if already following
    const { data: existing } = await adminClient
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    if (existing) {
      // Unfollow
      await adminClient
        .from('follows')
        .delete()
        .eq('id', existing.id);

      // Delete follow notification
      await adminClient
        .from('notifications')
        .delete()
        .eq('actor_id', user.id)
        .eq('user_id', targetUserId)
        .eq('type', 'follow');

      return NextResponse.json({ following: false });
    } else {
      // Follow
      await adminClient
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

      return NextResponse.json({ following: true });
    }
  } catch (err) {
    console.error('Follow error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
