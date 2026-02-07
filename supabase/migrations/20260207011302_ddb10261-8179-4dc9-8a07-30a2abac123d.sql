-- Fix user_messages RLS infinite recursion + backfill conversation ids

-- 1) Backfill conversation_id for legacy rows
UPDATE public.user_messages
SET conversation_id = user_id
WHERE conversation_id IS NULL;

-- 2) Ensure conversation_id is always set on insert
CREATE OR REPLACE FUNCTION public.set_default_user_messages_conversation_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_id IS NULL THEN
    NEW.conversation_id := NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_default_user_messages_conversation_id ON public.user_messages;
CREATE TRIGGER set_default_user_messages_conversation_id
BEFORE INSERT ON public.user_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_default_user_messages_conversation_id();

-- 3) Replace recursive policies with non-recursive policies
DROP POLICY IF EXISTS "Admins can view all messages" ON public.user_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON public.user_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON public.user_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.user_messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.user_messages;
DROP POLICY IF EXISTS "Users can mark admin messages as read" ON public.user_messages;

CREATE POLICY "Admins can view all messages"
ON public.user_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert messages"
ON public.user_messages
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update messages"
ON public.user_messages
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own messages"
ON public.user_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
ON public.user_messages
FOR INSERT
WITH CHECK ((auth.uid() = user_id) AND (sender_type = 'user'));

CREATE POLICY "Users can mark admin messages as read"
ON public.user_messages
FOR UPDATE
USING ((auth.uid() = user_id) AND (sender_type = 'admin'))
WITH CHECK ((auth.uid() = user_id) AND (sender_type = 'admin'));

-- 4) Prevent non-admin users from editing message content/metadata
CREATE OR REPLACE FUNCTION public.restrict_user_messages_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Admins can update freely
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admins: only allow marking as read (and never unread)
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF NEW.message IS DISTINCT FROM OLD.message THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF NEW.sender_type IS DISTINCT FROM OLD.sender_type THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF NEW.parent_message_id IS DISTINCT FROM OLD.parent_message_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF OLD.is_read = true AND NEW.is_read = false THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS restrict_user_messages_updates ON public.user_messages;
CREATE TRIGGER restrict_user_messages_updates
BEFORE UPDATE ON public.user_messages
FOR EACH ROW
EXECUTE FUNCTION public.restrict_user_messages_updates();

-- 5) Ensure realtime is enabled for this table (safe check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_messages;
  END IF;
END $$;