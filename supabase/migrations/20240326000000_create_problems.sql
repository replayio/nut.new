-- Create problems table
CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'solved', 'unsolved')),
  keywords TEXT[] NOT NULL DEFAULT '{}',
  repository_contents JSONB NOT NULL DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id)
);

-- Create problem_comments table
CREATE TABLE IF NOT EXISTS problem_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  username TEXT NOT NULL
);

-- Create updated_at trigger for problems table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_problems_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_comments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to problems and comments
CREATE POLICY "Allow public read access to problems"
  ON problems FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to problem comments"
  ON problem_comments FOR SELECT
  TO public
  USING (true);

-- Allow anyone to create problems (including anonymous users)
DROP POLICY IF EXISTS "Allow authenticated users to create problems" ON problems;
DROP POLICY IF EXISTS "Allow anyone to create problems" ON problems;
CREATE POLICY "Allow anyone to create problems"
  ON problems FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to update problems
DROP POLICY IF EXISTS "Allow authenticated users to update problems" ON problems;
DROP POLICY IF EXISTS "Allow anyone to update problems" ON problems;
CREATE POLICY "Allow anyone to update problems"
  ON problems FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow anyone to create comments
DROP POLICY IF EXISTS "Allow authenticated users to create comments" ON problem_comments;
DROP POLICY IF EXISTS "Allow anyone to create comments" ON problem_comments;
CREATE POLICY "Allow anyone to create comments"
  ON problem_comments FOR INSERT
  TO public
  WITH CHECK (true);

-- Create function to get problem with comments
CREATE OR REPLACE FUNCTION get_problem_with_comments(problem_id UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  title TEXT,
  description TEXT,
  status TEXT,
  keywords TEXT[],
  repository_contents JSONB,
  user_id UUID,
  problem_comments JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.created_at,
    p.updated_at,
    p.title,
    p.description,
    p.status,
    p.keywords,
    p.repository_contents,
    p.user_id,
    COALESCE(
      json_agg(
        json_build_object(
          'id', c.id,
          'created_at', c.created_at,
          'problem_id', c.problem_id,
          'content', c.content,
          'username', c.username
        )
      ) FILTER (WHERE c.id IS NOT NULL),
      '[]'::json
    ) as problem_comments
  FROM problems p
  LEFT JOIN problem_comments c ON c.problem_id = p.id
  WHERE p.id = problem_id
  GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Create profiles for existing users who don't have one
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all users in auth.users who don't have a profile
    FOR user_record IN 
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.id = au.id
        WHERE p.id IS NULL
    LOOP
        -- Insert a new profile for each user
        INSERT INTO public.profiles (
            id,
            username,
            full_name,
            avatar_url,
            is_admin
        ) VALUES (
            user_record.id,
            user_record.email,
            NULL,
            NULL,
            FALSE
        );
        
        RAISE NOTICE 'Created profile for user %', user_record.email;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Output the number of profiles created
SELECT 'Profiles created for existing users: ' || COUNT(*)::text as result
FROM (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
) as missing_profiles;

-- List all profiles
SELECT 
    p.id,
    p.username,
    p.is_admin,
    p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC; 