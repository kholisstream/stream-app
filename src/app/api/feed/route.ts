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
    const userId = searchParams.get('user_id');
    const postId = searchParams.get('post_id');

    // Get single post with thread
    if (postId) {
      return await getPostThread(adminClient, postId, currentUserId);
    }

    // Get user's posts
    if (userId) {
      const { data: posts, error } = await adminClient
        .from('posts')
        .select('*, profile:profiles(*)')
        .eq('user_id', userId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const postsWithStats = await enrichPosts(adminClient, posts || [], currentUserId);
      return NextResponse.json({ posts: postsWithStats });
    }

    // Get feed (posts from followed users + all posts)
    return await getFeed(adminClient, currentUserId);
  } catch (err) {
    console.error('Feed error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getFeed(adminClient: ReturnType<typeof createAdminClient>, currentUserId: string | null) {
  let followedIds: string[] = [];

  if (currentUserId) {
    const { data: follows } = await adminClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    followedIds = (follows || []).map(f => f.following_id);
  }

  // Get posts - prioritize followed users, then fill with recent posts
  let query = adminClient
    .from('posts')
    .select('*, profile:profiles(*)')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: posts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Sort: followed users first, then by date
  let sortedPosts = posts || [];
  if (followedIds.length > 0) {
    sortedPosts.sort((a, b) => {
      const aFollowed = followedIds.includes(a.user_id) ? 0 : 1;
      const bFollowed = followedIds.includes(b.user_id) ? 0 : 1;
      if (aFollowed !== bFollowed) return aFollowed - bFollowed;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  const postsWithStats = await enrichPosts(adminClient, sortedPosts, currentUserId);
  return NextResponse.json({ posts: postsWithStats });
}

async function getPostThread(
  adminClient: ReturnType<typeof createAdminClient>,
  postId: string,
  currentUserId: string | null
) {
  // Get the post
  const { data: post, error } = await adminClient
    .from('posts')
    .select('*, profile:profiles(*)')
    .eq('id', postId)
    .single();

  if (error || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Get replies
  const { data: replies } = await adminClient
    .from('posts')
    .select('*, profile:profiles(*)')
    .eq('parent_id', postId)
    .order('created_at', { ascending: true });

  // Get parent posts (for context)
  let parentPosts: any[] = [];
  if (post.parent_id) {
    let currentParentId = post.parent_id;
    while (currentParentId) {
      const { data: parent } = await adminClient
        .from('posts')
        .select('*, profile:profiles(*)')
        .eq('id', currentParentId)
        .single();
      
      if (parent) {
        parentPosts.unshift(parent);
        currentParentId = parent.parent_id;
      } else {
        break;
      }
    }
  }

  const enrichedPost = await enrichPosts(adminClient, [post], currentUserId);
  const enrichedReplies = await enrichPosts(adminClient, replies || [], currentUserId);
  const enrichedParents = await enrichPosts(adminClient, parentPosts, currentUserId);

  return NextResponse.json({
    post: enrichedPost[0],
    replies: enrichedReplies,
    parents: enrichedParents,
  });
}

async function enrichPosts(
  adminClient: ReturnType<typeof createAdminClient>,
  posts: any[],
  currentUserId: string | null
): Promise<any[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map(p => p.id);

  // Get likes
  const { data: likes } = await adminClient
    .from('likes')
    .select('post_id, user_id')
    .in('post_id', postIds);

  // Get reposts
  const { data: reposts } = await adminClient
    .from('reposts')
    .select('post_id, user_id')
    .in('post_id', postIds);

  // Get reply counts
  const { data: replyCounts } = await adminClient
    .from('posts')
    .select('parent_id')
    .in('parent_id', postIds);

  const likeMap = new Map<string, number>();
  const userLikedSet = new Set<string>();
  (likes || []).forEach(l => {
    likeMap.set(l.post_id, (likeMap.get(l.post_id) || 0) + 1);
    if (currentUserId && l.user_id === currentUserId) {
      userLikedSet.add(l.post_id);
    }
  });

  const repostMap = new Map<string, number>();
  const userRepostedSet = new Set<string>();
  (reposts || []).forEach(r => {
    repostMap.set(r.post_id, (repostMap.get(r.post_id) || 0) + 1);
    if (currentUserId && r.user_id === currentUserId) {
      userRepostedSet.add(r.post_id);
    }
  });

  const replyMap = new Map<string, number>();
  (replyCounts || []).forEach(r => {
    replyMap.set(r.parent_id, (replyMap.get(r.parent_id) || 0) + 1);
  });

  return posts.map(post => ({
    ...post,
    like_count: likeMap.get(post.id) || 0,
    repost_count: repostMap.get(post.id) || 0,
    reply_count: replyMap.get(post.id) || 0,
    is_liked: userLikedSet.has(post.id),
    is_reposted: userRepostedSet.has(post.id),
  }));
}
