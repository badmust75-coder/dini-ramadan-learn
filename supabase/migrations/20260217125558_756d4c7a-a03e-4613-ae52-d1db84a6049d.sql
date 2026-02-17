
-- Create alphabet_content table
CREATE TABLE public.alphabet_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  letter_id integer NOT NULL REFERENCES public.alphabet_letters(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alphabet_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alphabet content" ON public.alphabet_content FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view alphabet content" ON public.alphabet_content FOR SELECT USING (true);

-- Create invocation_content table
CREATE TABLE public.invocation_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invocation_id integer NOT NULL REFERENCES public.invocations(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invocation_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invocation content" ON public.invocation_content FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view invocation content" ON public.invocation_content FOR SELECT USING (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('alphabet-content', 'alphabet-content', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('invocation-content', 'invocation-content', true);

-- Storage policies for alphabet-content
CREATE POLICY "Public read alphabet content" ON storage.objects FOR SELECT USING (bucket_id = 'alphabet-content');
CREATE POLICY "Admins upload alphabet content" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'alphabet-content' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete alphabet content" ON storage.objects FOR DELETE USING (bucket_id = 'alphabet-content' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for invocation-content
CREATE POLICY "Public read invocation content" ON storage.objects FOR SELECT USING (bucket_id = 'invocation-content');
CREATE POLICY "Admins upload invocation content" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invocation-content' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete invocation content" ON storage.objects FOR DELETE USING (bucket_id = 'invocation-content' AND has_role(auth.uid(), 'admin'::app_role));
