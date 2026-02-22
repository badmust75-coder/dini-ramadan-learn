
-- Create invocation validation requests table
CREATE TABLE public.invocation_validation_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  invocation_id integer NOT NULL REFERENCES public.invocations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

ALTER TABLE public.invocation_validation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create invocation validation requests" ON public.invocation_validation_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own invocation validation requests" ON public.invocation_validation_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all invocation validation requests" ON public.invocation_validation_requests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update invocation validation requests" ON public.invocation_validation_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete invocation validation requests" ON public.invocation_validation_requests FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.invocation_validation_requests;
