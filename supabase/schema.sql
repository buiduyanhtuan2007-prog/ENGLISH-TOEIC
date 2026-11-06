-- Chạy một lần trong Supabase: SQL Editor > New query > dán toàn bộ file này > Run.
-- Mỗi người dùng có đúng một hàng chứa tiến độ học (cột data kiểu JSON).

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Bật bảo mật theo hàng: mỗi người chỉ đọc và sửa được hàng của chính mình.
alter table public.progress enable row level security;

drop policy if exists "progress_select_own" on public.progress;
drop policy if exists "progress_insert_own" on public.progress;
drop policy if exists "progress_update_own" on public.progress;
drop policy if exists "progress_delete_own" on public.progress;

create policy "progress_select_own" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "progress_insert_own" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "progress_update_own" on public.progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "progress_delete_own" on public.progress
  for delete to authenticated using ((select auth.uid()) = user_id);
