-- Add a settings table for Ramadan global configuration
CREATE TABLE public.ramadan_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ramadan_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read ramadan settings"
ON public.ramadan_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can manage ramadan settings"
ON public.ramadan_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings row
INSERT INTO public.ramadan_settings (start_enabled) VALUES (false);