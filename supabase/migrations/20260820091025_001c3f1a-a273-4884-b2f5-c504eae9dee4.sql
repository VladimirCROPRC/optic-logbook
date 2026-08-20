REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owns_installation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_closure(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_installation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_closure(UUID) TO authenticated;