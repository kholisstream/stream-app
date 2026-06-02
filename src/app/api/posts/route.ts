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

    // Verify user
    const { data: { user }, error: authError } = await adminClient.auth.admin.getUserByToken(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, parent_id } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Post must be 500 characters or less' }, { status: 400 });
    }

    const { data: post, error } = await adminClient
      .from('posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch with profile
    const { data: fullPost } = await adminClient
      .from('posts')
      .select('*, profile:profiles(*)')
      .eq('id', post.id)
      .single();

    return NextResponse.json({
      ...fullPost,
      like_count: 0,
      repost_count: 0,
      reply_count: 0,
      is_liked: false,
      is_reposted: false,
    }, { status: 201 });
  } catch (err) {
    console.error('Create post error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { error } = await adminClient
      .from('posts')
      .delete()
      .eq('id', post_id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete post error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
