-- Add reply fields to user_messages for conversation threads
ALTER TABLE public.user_messages 
ADD COLUMN IF NOT EXISTS sender_type text NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user', 'admin')),
ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES public.user_messages(id),
ADD COLUMN IF NOT EXISTS conversation_id uuid;

-- Create index for conversation queries
CREATE INDEX IF NOT EXISTS idx_user_messages_conversation ON public.user_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_user_unread ON public.user_messages(user_id, is_read) WHERE sender_type = 'admin';

-- Update RLS to allow admins to insert replies
DROP POLICY IF EXISTS "Admins can insert messages" ON public.user_messages;
CREATE POLICY "Admins can insert messages" 
ON public.user_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow users to view admin replies to their conversations
DROP POLICY IF EXISTS "Users can view their own messages" ON public.user_messages;
CREATE POLICY "Users can view their own messages" 
ON public.user_messages 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (
    sender_type = 'admin' 
    AND conversation_id IN (
      SELECT DISTINCT conversation_id FROM public.user_messages WHERE user_id = auth.uid()
    )
  )
);

-- Allow users to update read status of admin messages in their conversations
DROP POLICY IF EXISTS "Users can mark admin messages as read" ON public.user_messages;
CREATE POLICY "Users can mark admin messages as read" 
ON public.user_messages 
FOR UPDATE 
USING (
  sender_type = 'admin' 
  AND conversation_id IN (
    SELECT DISTINCT conversation_id FROM public.user_messages WHERE user_id = auth.uid()
  )
);