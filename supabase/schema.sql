-- Stream App - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

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

-- Profiles: anyone can read, users can update their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts: anyone can read, authenticated users can insert, users can update/delete own
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Likes: anyone can read, authenticated users can like, users can unlike
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Reposts: same as likes
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reposts are viewable by everyone" ON public.reposts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can repost" ON public.reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrepost" ON public.reposts FOR DELETE USING (auth.uid() = user_id);

-- Follows: anyone can read, authenticated users can follow, users can unfollow
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Notifications: users can read their own, system can insert
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- FUNCTIONS & TRIGGERS FOR NOTIFICATIONS
-- ==========================================

-- Notification on like
CREATE OR REPLACE FUNCTION notify_like()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  SELECT p.user_id, NEW.user_id, 'like', NEW.post_id
  FROM public.posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION notify_like();

-- Notification on repost
CREATE OR REPLACE FUNCTION notify_repost()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  SELECT p.user_id, NEW.user_id, 'repost', NEW.post_id
  FROM public.posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_repost AFTER INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION notify_repost();

-- Notification on follow
CREATE OR REPLACE FUNCTION notify_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION notify_follow();

-- Notification on reply
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
