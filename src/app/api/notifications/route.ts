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

    const { data: { user }, error: authError } = await adminClient.auth.admin.getUserByToken(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: notifications, error } = await adminClient
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_fkey(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Enrich notifications with post data if applicable
    const enrichedNotifications = await Promise.all(
      (notifications || []).map(async (n) => {
        let post = null;
        if (n.post_id) {
          const { data: postData } = await adminClient
            .from('posts')
            .select('*, profile:profiles(*)')
            .eq('id', n.post_id)
            .single();
          post = postData;
        }
        return { ...n, post };
      })
    );

    return NextResponse.json({ notifications: enrichedNotifications });
  } catch (err) {
    console.error('Notifications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const { notification_ids } = await request.json();

    if (notification_ids && notification_ids.length > 0) {
      await adminClient
        .from('notifications')
        .update({ read: true })
        .in('id', notification_ids)
        .eq('user_id', user.id);
    } else {
      // Mark all as read
      await adminClient
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Mark notifications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
