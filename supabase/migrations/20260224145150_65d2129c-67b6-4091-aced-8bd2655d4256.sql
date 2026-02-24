
-- Add audio support columns to user_messages
ALTER TABLE public.user_messages 
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create storage bucket for message audio
INSERT INTO storage.buckets (id, name, public) 
VALUES ('messages-audio', 'messages-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for messages-audio bucket
CREATE POLICY "Anyone can read message audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'messages-audio');

CREATE POLICY "Authenticated users can upload message audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'messages-audio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own message audio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'messages-audio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own message audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'messages-audio' AND auth.uid() IS NOT NULL);

-- Allow admin to DELETE messages (soft delete via update already covered)
CREATE POLICY "Admins can delete messages"
ON public.user_messages FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
