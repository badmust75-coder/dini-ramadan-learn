
-- Insert "Grammaire et Conjugaison" module into learning_modules
INSERT INTO public.learning_modules (title, title_arabic, description, icon, gradient, icon_color, is_active, is_builtin, builtin_path, display_order)
VALUES (
  'Grammaire & Conjugaison',
  'النحو والصرف',
  'Règles de grammaire arabe et conjugaison',
  'BookOpen',
  'from-blue-600 via-blue-700 to-blue-800',
  'text-white',
  true,
  true,
  '/grammaire',
  100
)
ON CONFLICT DO NOTHING;
