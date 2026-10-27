-- Keep internal/custom-auth tables unavailable through the public Data API.
revoke all on table public.schema_migrations from public, anon, authenticated;
revoke all on table public.users from public, anon, authenticated;
