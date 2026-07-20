-- Portfolio : contenu centralisé + storage + engagement articles
-- Script idempotent (peut être relancé sans erreur)

-- ============================================================
-- 1) Contenus portfolio (projects/articles/experiences/skills)
-- ============================================================
create table if not exists public.portfolio_content (
  content_key text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.portfolio_content is
  'Une ligne par clé : projects | articles | experiences | skills (body = tableau ou objet JSON)';

alter table public.portfolio_content enable row level security;

drop policy if exists "portfolio_content_select_public" on public.portfolio_content;
create policy "portfolio_content_select_public"
  on public.portfolio_content
  for select
  using (true);

drop policy if exists "portfolio_content_insert_authenticated" on public.portfolio_content;
drop policy if exists "portfolio_content_insert_admin_only" on public.portfolio_content;
create policy "portfolio_content_insert_admin_only"
  on public.portfolio_content
  for insert
  to authenticated
  with check (true);

drop policy if exists "portfolio_content_update_authenticated" on public.portfolio_content;
drop policy if exists "portfolio_content_update_admin_only" on public.portfolio_content;
create policy "portfolio_content_update_admin_only"
  on public.portfolio_content
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "portfolio_content_delete_authenticated" on public.portfolio_content;
drop policy if exists "portfolio_content_delete_admin_only" on public.portfolio_content;
create policy "portfolio_content_delete_admin_only"
  on public.portfolio_content
  for delete
  to authenticated
  using (true);

-- ============================================================
-- 2) Storage images inline (markdown articles)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('portfolio-inline-images', 'portfolio-inline-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "portfolio_inline_images_public_read" on storage.objects;
create policy "portfolio_inline_images_public_read"
  on storage.objects
  for select
  using (bucket_id = 'portfolio-inline-images');

drop policy if exists "portfolio_inline_images_auth_insert" on storage.objects;
create policy "portfolio_inline_images_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'portfolio-inline-images');

drop policy if exists "portfolio_inline_images_auth_update" on storage.objects;
create policy "portfolio_inline_images_auth_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'portfolio-inline-images')
  with check (bucket_id = 'portfolio-inline-images');

drop policy if exists "portfolio_inline_images_auth_delete" on storage.objects;
create policy "portfolio_inline_images_auth_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'portfolio-inline-images');

-- ============================================================
-- 3) Engagement public des articles (likes/réactions/commentaires)
-- ============================================================
create table if not exists public.article_engagement (
  article_slug text primary key,
  likes integer not null default 0,
  reactions jsonb not null default '{}'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.article_engagement enable row level security;

drop policy if exists "article_engagement_select_public" on public.article_engagement;
create policy "article_engagement_select_public"
  on public.article_engagement
  for select
  using (true);

drop policy if exists "article_engagement_insert_public" on public.article_engagement;
drop policy if exists "article_engagement_insert_authenticated" on public.article_engagement;
create policy "article_engagement_insert_authenticated"
  on public.article_engagement
  for insert
  with check (
    likes >= 0
    and jsonb_typeof(reactions) = 'object'
    and jsonb_typeof(comments) = 'array'
  );

drop policy if exists "article_engagement_update_public" on public.article_engagement;
drop policy if exists "article_engagement_update_authenticated" on public.article_engagement;
create policy "article_engagement_update_authenticated"
  on public.article_engagement
  for update
  using (true)
  with check (
    likes >= 0
    and jsonb_typeof(reactions) = 'object'
    and jsonb_typeof(comments) = 'array'
  );

-- ============================================================
-- 4) Newsletter (inscriptions + notifications articles)
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
