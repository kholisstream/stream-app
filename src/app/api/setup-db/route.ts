import { NextResponse } from 'next/server';
import { Client } from 'pg';

const schemaSQL = `
-- Stream App - Supabase Database Schema

-- ==========================================
-- PROFILES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- POSTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id ON public.posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- ==========================================
-- LIKES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- ==========================================
-- REPOSTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.reposts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON public.reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_reposts_user_id ON public.reposts(user_id);

-- ==========================================
-- FOLLOWS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- ==========================================
-- NOTIFICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'repost', 'follow', 'reply')),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Reposts are viewable by everyone" ON public.reposts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can repost" ON public.reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can unrepost" ON public.reposts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- TRIGGERS FOR NOTIFICATIONS
-- ==========================================

CREATE OR REPLACE FUNCTION notify_like()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  SELECT p.user_id, NEW.user_id, 'like', NEW.post_id
  FROM public.posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like ON public.likes;
CREATE TRIGGER on_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION notify_like();

CREATE OR REPLACE FUNCTION notify_repost()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  SELECT p.user_id, NEW.user_id, 'repost', NEW.post_id
  FROM public.posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_repost ON public.reposts;
CREATE TRIGGER on_repost AFTER INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION notify_repost();

CREATE OR REPLACE FUNCTION notify_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow ON public.follows;
CREATE TRIGGER on_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION notify_follow();

CREATE OR REPLACE FUNCTION notify_reply()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    SELECT p.user_id, NEW.user_id, 'reply', NEW.id
    FROM public.posts p WHERE p.id = NEW.parent_id AND p.user_id != NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_reply ON public.posts;
CREATE TRIGGER on_reply AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION notify_reply();

-- ==========================================
-- HELPER: Post stats view
-- ==========================================
CREATE OR REPLACE VIEW public.post_stats AS
SELECT
  p.id AS post_id,
  COUNT(DISTINCT l.id) AS like_count,
  COUNT(DISTINCT rp.id) AS repost_count,
  COUNT(DISTINCT r.id) AS reply_count
FROM public.posts p
LEFT JOIN public.likes l ON l.post_id = p.id
LEFT JOIN public.reposts rp ON rp.post_id = p.id
LEFT JOIN public.posts r ON r.parent_id = p.id
GROUP BY p.id;
`;

async function tryConnect(connectionUrl: string): Promise<Client | null> {
  const client = new Client({
    connectionString: connectionUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return client;
  } catch {
    try { await client.end(); } catch { /* ignore */ }
    return null;
  }
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Try the DATABASE_URL first
  let client: Client | null = null;
  let usedUrl = '';

  if (databaseUrl) {
    client = await tryConnect(databaseUrl);
    if (client) usedUrl = databaseUrl;
  }

  // If DATABASE_URL doesn't work, try pooler connections with different regions
  if (!client && supabaseUrl) {
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    const dbPassword = process.env.SUPABASE_DB_PASSWORD || '';
    const encodedPassword = encodeURIComponent(dbPassword);

    const regions = [
      'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
      'eu-west-1', 'eu-west-2', 'eu-central-1', 'eu-central-2',
      'ap-southeast-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
      'ca-central-1', 'sa-east-1',
    ];

    for (const region of regions) {
      const poolerUrl = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
      client = await tryConnect(poolerUrl);
      if (client) {
        usedUrl = poolerUrl;
        break;
      }
    }
  }

  if (!client) {
    return NextResponse.json(
      { 
        error: 'Could not connect to database', 
        hint: 'Please set DATABASE_URL or SUPABASE_DB_PASSWORD environment variable with the correct connection string',
        tried: databaseUrl ? 'DATABASE_URL did not work' : 'No DATABASE_URL set',
      },
      { status: 500 }
    );
  }

  try {
    // Run schema
    await client.query(schemaSQL);
    
    // Verify tables exist
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    await client.end();
    
    return NextResponse.json({
      success: true,
      message: 'Database schema applied successfully!',
      tables: rows.map((r: { table_name: string }) => r.table_name),
      connectionUsed: usedUrl.replace(/:([^:@]+)@/, ':****@'),
    });
  } catch (error: unknown) {
    let message = 'Unknown error';
    if (error instanceof Error) {
      message = error.message;
    }
    
    try { await client.end(); } catch { /* ignore */ }
    
    return NextResponse.json(
      { error: 'Failed to apply database schema', details: message },
      { status: 500 }
    );
  }
}
