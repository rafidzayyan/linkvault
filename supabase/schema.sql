-- ============================================================================
-- LinkVault — Skema database Supabase (Postgres)
-- Jalankan seluruh file ini di: Supabase Dashboard → SQL Editor → New query → Run
-- Aman dijalankan ulang (idempotent): pakai IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABEL
-- ----------------------------------------------------------------------------

-- Vault = satu koleksi link milik seorang owner (bisa di-share ke email lain)
create table if not exists public.vaults (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null default 'LinkVault',
  created_at timestamptz not null default now()
);

-- Daftar share. Berbasis email supaya bisa mengundang sebelum orangnya mendaftar.
create table if not exists public.vault_members (
  id         uuid primary key default gen_random_uuid(),
  vault_id   uuid not null references public.vaults (id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  unique (vault_id, email)
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  vault_id   uuid not null references public.vaults (id) on delete cascade,
  name       text not null,
  color      text not null default '#64748b',
  icon       text,
  "order"    int  not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.links (
  id             uuid primary key default gen_random_uuid(),
  vault_id       uuid not null references public.vaults (id) on delete cascade,
  url            text not null,
  title          text not null,
  description    text,
  category_id    uuid,
  tags           text[] not null default '{}',
  favicon        text,
  is_favorite    boolean not null default false,
  is_read        boolean not null default false,
  click_count    int not null default 0,
  last_opened_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_categories_vault on public.categories (vault_id);
create index if not exists idx_links_vault      on public.links (vault_id);
create index if not exists idx_members_email    on public.vault_members (email);

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS (security definer → tidak kena RLS, hindari rekursi)
-- ----------------------------------------------------------------------------

-- true jika user saat ini adalah owner ATAU email-nya terdaftar sebagai member vault
create or replace function public.is_vault_member(vid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.vaults v
    where v.id = vid and v.owner_id = auth.uid()
  ) or exists (
    select 1 from public.vault_members m
    where m.vault_id = vid
      and lower(m.email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- true jika user saat ini boleh mengubah data vault (owner ATAU member role 'editor')
create or replace function public.can_edit_vault(vid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.vaults v
    where v.id = vid and v.owner_id = auth.uid()
  ) or exists (
    select 1 from public.vault_members m
    where m.vault_id = vid
      and lower(m.email) = lower(auth.jwt() ->> 'email')
      and m.role = 'editor'
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.vaults         enable row level security;
alter table public.vault_members  enable row level security;
alter table public.categories     enable row level security;
alter table public.links          enable row level security;

-- vaults ---------------------------------------------------------------------
drop policy if exists vaults_select on public.vaults;
create policy vaults_select on public.vaults
  for select using (public.is_vault_member(id));

drop policy if exists vaults_insert on public.vaults;
create policy vaults_insert on public.vaults
  for insert with check (owner_id = auth.uid());

drop policy if exists vaults_update on public.vaults;
create policy vaults_update on public.vaults
  for update using (owner_id = auth.uid());

drop policy if exists vaults_delete on public.vaults;
create policy vaults_delete on public.vaults
  for delete using (owner_id = auth.uid());

-- vault_members --------------------------------------------------------------
-- SELECT: owner vault, atau member melihat baris miliknya sendiri
drop policy if exists members_select on public.vault_members;
create policy members_select on public.vault_members
  for select using (
    exists (select 1 from public.vaults v where v.id = vault_id and v.owner_id = auth.uid())
    or lower(email) = lower(auth.jwt() ->> 'email')
  );

-- INSERT / UPDATE / DELETE: hanya owner vault
drop policy if exists members_insert on public.vault_members;
create policy members_insert on public.vault_members
  for insert with check (
    exists (select 1 from public.vaults v where v.id = vault_id and v.owner_id = auth.uid())
  );

drop policy if exists members_update on public.vault_members;
create policy members_update on public.vault_members
  for update using (
    exists (select 1 from public.vaults v where v.id = vault_id and v.owner_id = auth.uid())
  );

drop policy if exists members_delete on public.vault_members;
create policy members_delete on public.vault_members
  for delete using (
    exists (select 1 from public.vaults v where v.id = vault_id and v.owner_id = auth.uid())
  );

-- categories -----------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select using (public.is_vault_member(vault_id));

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert with check (public.can_edit_vault(vault_id));

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update using (public.can_edit_vault(vault_id));

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete using (public.can_edit_vault(vault_id));

-- links ----------------------------------------------------------------------
drop policy if exists links_select on public.links;
create policy links_select on public.links
  for select using (public.is_vault_member(vault_id));

drop policy if exists links_insert on public.links;
create policy links_insert on public.links
  for insert with check (public.can_edit_vault(vault_id));

drop policy if exists links_update on public.links;
create policy links_update on public.links
  for update using (public.can_edit_vault(vault_id));

drop policy if exists links_delete on public.links;
create policy links_delete on public.links
  for delete using (public.can_edit_vault(vault_id));

-- ----------------------------------------------------------------------------
-- 4. REALTIME
-- Aktifkan agar perubahan links & categories terkirim live ke klien.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'links'
  ) then
    alter publication supabase_realtime add table public.links;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;
