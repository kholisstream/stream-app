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

    const { post_id } = await request.json();
    if (!post_id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    // Check if already reposted
    const { data: existing } = await adminClient
      .from('reposts')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', post_id)
      .single();

    if (existing) {
      // Unrepost
      await adminClient
        .from('reposts')
        .delete()
        .eq('id', existing.id);

      // Delete repost notification
      await adminClient
        .from('notifications')
        .delete()
        .eq('actor_id', user.id)
        .eq('type', 'repost')
        .eq('post_id', post_id);

      return NextResponse.json({ reposted: false });
    } else {
      // Repost
      await adminClient
        .from('reposts')
        .insert({
          user_id: user.id,
          post_id,
        });

      return NextResponse.json({ reposted: true });
    }
  } catch (err) {
    console.error('Repost error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
