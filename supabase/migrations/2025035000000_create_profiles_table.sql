-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL
)
-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at()
-- Create a policy to allow users to read all profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true)
-- Drop the existing policies if they exist
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles
DROP POLICY IF EXISTS "Only admins can update is_admin field" ON public.profiles
-- Create a policy to allow users to update their own non-admin fields
CREATE OR REPLACE FUNCTION check_is_admin_unchanged(is_admin_new boolean, user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin_old boolean;
BEGIN
  SELECT p.is_admin INTO is_admin_old FROM public.profiles p WHERE p.id = user_id;
  RETURN is_admin_new = is_admin_old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
-- Create a policy to allow users to update their own profile EXCEPT the is_admin field
CREATE POLICY "Users can update their own non-admin fields" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  check_is_admin_unchanged(is_admin, id)
)
-- Create a policy to allow only admins to update any profile including the is_admin field
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
)
-- Create a policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (
  auth.uid() = id AND 
  (is_admin = false OR auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true))
)
-- Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY
-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a row into public.profiles
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (NEW.id, NEW.email, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
-- Create a trigger to automatically create a profile for new users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user()
-- Set the first user as an admin (optional - uncomment and modify as needed)
-- UPDATE public.profiles
-- SET is_admin = TRUE
-- WHERE id = '[YOUR_USER_ID]';
