-- AI Token Vault — migrasi awal
-- Apply manual via Supabase SQL Editor (satu kali, urut dari atas).

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  deleted_at timestamptz
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-buat row profiles saat user register. Status default 'pending'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper: cek admin tanpa memicu rekursi RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
      AND deleted_at IS NULL
  );
$$;

-- ============ providers ============
CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  category text,
  model text,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- ============ tokens ============
CREATE TABLE IF NOT EXISTS public.tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  label text NOT NULL,
  token_encrypted text NOT NULL,
  token_iv text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- ============ RLS: providers ============
DROP POLICY IF EXISTS "users see own providers" ON providers;
CREATE POLICY "users see own providers"
ON providers FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own providers" ON providers;
CREATE POLICY "users insert own providers"
ON providers FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own providers" ON providers;
CREATE POLICY "users update own providers"
ON providers FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own providers" ON providers;
CREATE POLICY "users delete own providers"
ON providers FOR DELETE
USING (auth.uid() = user_id);

-- ============ RLS: tokens ============
DROP POLICY IF EXISTS "users see own tokens" ON tokens;
CREATE POLICY "users see own tokens"
ON tokens FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own tokens" ON tokens;
CREATE POLICY "users insert own tokens"
ON tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own tokens" ON tokens;
CREATE POLICY "users update own tokens"
ON tokens FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own tokens" ON tokens;
CREATE POLICY "users delete own tokens"
ON tokens FOR DELETE
USING (auth.uid() = user_id);

-- ============ RLS: profiles ============
-- User cuma bisa lihat dirinya sendiri; admin lihat semua. Tulis (approve/reject/
-- delete) lewat API route pakai service role, jadi TIDAK ada policy INSERT/UPDATE
-- untuk user biasa — ini yang nyegah user naikin role/status sendiri.
DROP POLICY IF EXISTS "users see own profile" ON profiles;
CREATE POLICY "users see own profile"
ON profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

-- ============ ADMIN PERTAMA ============
-- Register dulu lewat UI, lalu jalankan (ganti email):
-- UPDATE public.profiles
-- SET role = 'admin', status = 'active', approved_at = now()
-- WHERE email = 'admin@example.com';
