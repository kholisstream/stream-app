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
    const username = searchParams.get('username');
    const userId = searchParams.get('user_id');

    if (username) {
      const { data: profile, error } = await adminClient
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      const enrichedProfile = await enrichProfile(adminClient, profile, currentUserId);
      return NextResponse.json({ profile: enrichedProfile });
    }

    if (userId) {
      const { data: profile, error } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      const enrichedProfile = await enrichProfile(adminClient, profile, currentUserId);
      return NextResponse.json({ profile: enrichedProfile });
    }

    return NextResponse.json({ error: 'Username or user_id required' }, { status: 400 });
  } catch (err) {
    console.error('Profile error:', err);
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

    const { username, full_name, bio, avatar_url } = await request.json();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (username !== undefined) updates.username = username;
    if (full_name !== undefined) updates.full_name = full_name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    // Check username uniqueness if changing
    if (username) {
      const { data: existing } = await adminClient
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
    }

    const { data: profile, error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const enrichedProfile = await enrichProfile(adminClient, profile, user.id);
    return NextResponse.json({ profile: enrichedProfile });
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function enrichProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  profile: any,
  currentUserId: string | null
) {
  // Get follower/following counts
  const { count: followerCount } = await adminClient
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id);

  const { count: followingCount } = await adminClient
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profile.id);

  // Get post count
  const { count: postCount } = await adminClient
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .is('parent_id', null);

  // Check if current user follows this profile
  let isFollowing = false;
  if (currentUserId && currentUserId !== profile.id) {
    const { data: follow } = await adminClient
      .from('follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', profile.id)
      .single();
    isFollowing = !!follow;
  }

  return {
    ...profile,
    follower_count: followerCount || 0,
    following_count: followingCount || 0,
    post_count: postCount || 0,
    is_following: isFollowing,
  };
}
