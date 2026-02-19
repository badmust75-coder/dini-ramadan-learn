
-- Create learning_modules table for dynamic home modules
CREATE TABLE public.learning_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  title_arabic text NOT NULL DEFAULT '',
  description text,
  icon text NOT NULL DEFAULT 'BookOpen',
  gradient text NOT NULL DEFAULT 'from-primary via-royal-dark to-primary',
  icon_color text NOT NULL DEFAULT 'text-gold',
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_builtin boolean NOT NULL DEFAULT false,
  builtin_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create module_content table for dynamic module files
CREATE TABLE public.module_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_content ENABLE ROW LEVEL SECURITY;

-- RLS policies for learning_modules
CREATE POLICY "Anyone can read active modules" ON public.learning_modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage modules" ON public.learning_modules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for module_content
CREATE POLICY "Anyone can read module content" ON public.module_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage module content" ON public.module_content FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_learning_modules_updated_at
  BEFORE UPDATE ON public.learning_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 6 existing builtin modules
INSERT INTO public.learning_modules (title, title_arabic, description, icon, gradient, icon_color, display_order, is_builtin, builtin_path) VALUES
  ('Ramadan', 'رمضان', '30 jours de spiritualité', 'Moon', 'from-primary via-royal-dark to-primary', 'text-gold', 0, true, '/ramadan'),
  ('Alphabet', 'الأبجدية', '28 lettres arabes', 'BookOpen', 'from-royal-light via-primary to-royal-dark', 'text-gold-light', 1, true, '/alphabet'),
  ('Invocations', 'الأدعية', 'Du''as quotidiennes', 'Hand', 'from-gold-dark via-gold to-gold-light', 'text-primary', 2, true, '/invocations'),
  ('Sourates', 'السور', '114 sourates du Coran', 'BookMarked', 'from-primary via-primary to-royal-light', 'text-gold', 3, true, '/sourates'),
  ('Nourania', 'النورانية', '17 leçons de tajweed', 'Sparkles', 'from-gold via-gold-dark to-gold', 'text-primary', 4, true, '/nourania'),
  ('Prière', 'الصلاة', 'Ablutions et prières', 'Hand', 'from-royal-dark via-primary to-royal-light', 'text-gold', 5, true, '/priere');

-- Seed the 4 new dynamic modules
INSERT INTO public.learning_modules (title, title_arabic, description, icon, gradient, icon_color, display_order, is_builtin, builtin_path) VALUES
  ('99 Noms d''Allah', 'أسماء الله الحسنى', 'Les plus beaux noms', 'Star', 'from-gold via-gold-dark to-gold-light', 'text-primary', 6, false, null),
  ('Grammaire et Conjugaison', 'النحو والصرف', 'Règles de la langue arabe', 'BookOpen', 'from-primary via-royal-dark to-primary', 'text-gold', 7, false, null),
  ('Vocabulaire', 'المفردات', 'Mots et expressions', 'MessageSquare', 'from-royal-light via-primary to-royal-dark', 'text-gold-light', 8, false, null),
  ('Lecture du Coran', 'تلاوة القرآن', 'Pratique de la récitation', 'BookMarked', 'from-gold via-gold-dark to-gold', 'text-primary', 9, false, null);

-- Create storage bucket for module content
INSERT INTO storage.buckets (id, name, public) VALUES ('module-content', 'module-content', true);

CREATE POLICY "Anyone can read module files" ON storage.objects FOR SELECT USING (bucket_id = 'module-content');
CREATE POLICY "Admins can upload module files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'module-content' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete module files" ON storage.objects FOR DELETE USING (bucket_id = 'module-content' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_modules;
