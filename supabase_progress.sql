-- OZON Grind Tracker v4.1 — облачное хранение прогресса
-- Зачем: до v4.1 весь прогресс (Life XP, покупки, темы, планы) жил ТОЛЬКО
-- в localStorage браузера. Запуск как отдельное приложение (PWA), другой
-- браузер или переустановка открывали пустое хранилище — XP «сбрасывался».
-- Эта таблица хранит прогресс в облаке, поэтому он больше не теряется.
--
-- Как применить: Supabase → SQL Editor → вставить → Run.

create table if not exists public.app_state (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Доступ для анонимного ключа (приложение без логина, как и таблица shifts).
drop policy if exists "app_state anon read"   on public.app_state;
drop policy if exists "app_state anon write"  on public.app_state;
drop policy if exists "app_state anon update" on public.app_state;

create policy "app_state anon read"
  on public.app_state for select
  using (true);

create policy "app_state anon write"
  on public.app_state for insert
  with check (true);

create policy "app_state anon update"
  on public.app_state for update
  using (true) with check (true);
