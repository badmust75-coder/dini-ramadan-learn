
-- Create admin_notes table
CREATE TABLE public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  content text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage admin_notes"
  ON public.admin_notes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can read public notes
CREATE POLICY "Users can read public notes"
  ON public.admin_notes FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-notes', 'admin-notes', true);

-- Storage policies
CREATE POLICY "Admins can upload note files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'admin-notes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete note files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'admin-notes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read note files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'admin-notes');
