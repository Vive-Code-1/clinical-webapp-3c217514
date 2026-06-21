-- Prevent any clinic owner from granting global roles to arbitrary users.
DROP POLICY IF EXISTS "Owners manage roles" ON public.user_roles;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;