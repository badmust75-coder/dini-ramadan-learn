
-- Create both tables first without cross-references
CREATE TABLE public.dashboard_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'FileText',
  bg_color text NOT NULL DEFAULT 'bg-blue-100',
  content_type text NOT NULL DEFAULT 'text',
  content text,
  file_url text,
  file_name text,
  is_public boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dashboard_card_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.dashboard_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

CREATE TABLE public.admin_card_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_key text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.dashboard_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_card_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_card_order ENABLE ROW LEVEL SECURITY;

-- Policies for dashboard_cards
CREATE POLICY "Admins can manage dashboard cards"
  ON public.dashboard_cards FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read visible cards"
  ON public.dashboard_cards FOR SELECT
  USING (
    is_public = true
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.dashboard_card_visibility
      WHERE card_id = dashboard_cards.id AND user_id = auth.uid()
    )
  );

-- Policies for dashboard_card_visibility
CREATE POLICY "Admins can manage card visibility"
  ON public.dashboard_card_visibility FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own visibility"
  ON public.dashboard_card_visibility FOR SELECT
  USING (auth.uid() = user_id);

-- Policies for admin_card_order
CREATE POLICY "Admins can manage card order"
  ON public.admin_card_order FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read card order"
  ON public.admin_card_order FOR SELECT
  USING (true);

-- Trigger
CREATE TRIGGER update_dashboard_cards_updated_at
  BEFORE UPDATE ON public.dashboard_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-content', 'admin-content', true);

CREATE POLICY "Admins can upload admin content"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'admin-content' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin content"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'admin-content' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete admin content"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'admin-content' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view admin content"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'admin-content');
