-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  metadata JSONB DEFAULT '{}'
)
-- Create updated_at trigger for feedback table
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column()
-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY
-- Create policies for feedback table
-- Allow public read access to feedback for admins
CREATE POLICY "Allow admin read access to all feedback"
  ON public.feedback FOR SELECT
  TO public
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
  )
-- Allow users to read their own feedback
CREATE POLICY "Allow users to read their own feedback"
  ON public.feedback FOR SELECT
  TO public
  USING (auth.uid() = user_id)
-- Allow anyone to create feedback (including anonymous users)
CREATE POLICY "Allow anyone to create feedback"
  ON public.feedback FOR INSERT
  TO public
  WITH CHECK (true)
-- Allow admins to update any feedback
CREATE POLICY "Allow admins to update any feedback"
  ON public.feedback FOR UPDATE
  TO public
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
  )
-- Allow users to update their own feedback
CREATE POLICY "Allow users to update their own feedback"
  ON public.feedback FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id)
