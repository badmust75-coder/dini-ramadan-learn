
-- Drop existing conflicting SELECT policies first
DROP POLICY IF EXISTS "Admins can view all ramadan progress" ON user_ramadan_progress;
DROP POLICY IF EXISTS "Admins can view all sourate progress" ON user_sourate_progress;
DROP POLICY IF EXISTS "Admins can view all nourania progress" ON user_nourania_progress;
DROP POLICY IF EXISTS "Admins can view all invocation progress" ON user_invocation_progress;

-- Combined admin+user SELECT policies
CREATE POLICY "admin_read_all_progress_ramadan" ON user_ramadan_progress
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_read_all_progress_sourate" ON user_sourate_progress
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_read_all_progress_nourania" ON user_nourania_progress
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_read_all_progress_prayer" ON user_prayer_progress
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_read_all_progress_alphabet" ON user_alphabet_progress
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_read_all_progress_invocation" ON user_invocation_progress
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  )
);
