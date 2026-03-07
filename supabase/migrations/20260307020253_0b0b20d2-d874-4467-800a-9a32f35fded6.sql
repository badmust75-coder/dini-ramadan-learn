
-- 1. Change default color from 'bg-blue-100' to 'bg-blue-500'
ALTER TABLE public.student_groups ALTER COLUMN color SET DEFAULT 'bg-blue-500';

-- 2. Add FK to auth.users (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'student_group_members_user_id_fkey' 
    AND table_name = 'student_group_members'
  ) THEN
    ALTER TABLE public.student_group_members 
      ADD CONSTRAINT student_group_members_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
