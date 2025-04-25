-- These tables aren't needed anymore.
DROP TABLE IF EXISTS public.problems;
DROP TABLE IF EXISTS public.problem_comments;

-- Create apps table
CREATE TABLE IF NOT EXISTS public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT,
  elapsed_minutes FLOAT,
  total_peanuts INTEGER,
  image_url TEXT,
  messages JSONB,
  protocol_chat_id UUID,
  deleted BOOLEAN DEFAULT FALSE,
);

-- Create updated_at trigger for apps table
CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON public.apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users full access
CREATE POLICY "Allow full access to all users" ON public.apps
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
