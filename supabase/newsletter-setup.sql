-- ============================================================
-- Newsletter — à exécuter dans Supabase → SQL Editor
-- Projet : kpfkdbfcqojeevsepgct (ou le vôtre)
-- ============================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  lang text not null default 'fr',
  active boolean not null default true,
  subscribed_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_unique unique (email),
  constraint newsletter_subscribers_lang_check check (lang in ('fr', 'en'))
);

create index if not exists newsletter_subscribers_active_idx
  on public.newsletter_subscribers (active)
  where active = true;

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter_insert_public" on public.newsletter_subscribers;
create policy "newsletter_insert_public"
  on public.newsletter_subscribers
  for insert
  with check (
    active = true
    and char_length(trim(email)) >= 5
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    and lang in ('fr', 'en')
  );

drop policy if exists "newsletter_select_authenticated" on public.newsletter_subscribers;
create policy "newsletter_select_authenticated"
  on public.newsletter_subscribers
  for select
  to authenticated
  using (true);
