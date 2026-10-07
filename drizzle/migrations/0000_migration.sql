-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- profiles
create table public.profiles (
  id uuid primary key,
  display_name text not null default '' check (char_length(display_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile delete" on public.profiles for delete to authenticated using (auth.uid() = id);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- user_settings
create table public.user_settings (
  user_id uuid primary key,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  notifications boolean not null default false,
  daily_summary boolean not null default true,
  week_starts_monday boolean not null default true,
  day_start_hour smallint not null default 0 check (day_start_hour between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "own settings select" on public.user_settings for select to authenticated using (auth.uid() = user_id);
create policy "own settings insert" on public.user_settings for insert to authenticated with check (auth.uid() = user_id);
create policy "own settings update" on public.user_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings delete" on public.user_settings for delete to authenticated using (auth.uid() = user_id);
create trigger user_settings_updated before update on public.user_settings for each row execute function public.set_updated_at();

-- auto-create profile + settings on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(left(new.raw_user_meta_data->>'display_name', 60), ''))
    on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- habits
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text not null default 'Target',
  category text not null default 'Health' check (category in ('Health','Fitness','Study','Productivity','Personal')),
  color text not null default 'coral' check (color in ('coral','amber','green','teal','blue','pink')),
  description text not null default '' check (char_length(description) <= 300),
  frequency_type text not null default 'daily' check (frequency_type in ('daily','weekdays','custom')),
  weekdays smallint[] not null default '{}',
  interval_days smallint not null default 1 check (interval_days between 1 and 365),
  target integer not null default 1 check (target between 1 and 1000),
  unit text not null default '' check (char_length(unit) <= 30),
  start_date date not null default current_date,
  archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (frequency_type <> 'weekdays' or cardinality(weekdays) > 0)
);
create index habits_user_idx on public.habits(user_id);
grant select, insert, update, delete on public.habits to authenticated;
grant all on public.habits to service_role;
alter table public.habits enable row level security;
create policy "own habits select" on public.habits for select to authenticated using (auth.uid() = user_id);
create policy "own habits insert" on public.habits for insert to authenticated with check (auth.uid() = user_id);
create policy "own habits update" on public.habits for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own habits delete" on public.habits for delete to authenticated using (auth.uid() = user_id);
create trigger habits_updated before update on public.habits for each row execute function public.set_updated_at();

-- reminders (one per habit)
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null unique references public.habits(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  enabled boolean not null default false,
  remind_at time not null default '08:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reminders to authenticated;
grant all on public.reminders to service_role;
alter table public.reminders enable row level security;
create policy "own reminders select" on public.reminders for select to authenticated using (auth.uid() = user_id);
create policy "own reminders insert" on public.reminders for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "own reminders update" on public.reminders for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "own reminders delete" on public.reminders for delete to authenticated using (auth.uid() = user_id);
create trigger reminders_updated before update on public.reminders for each row execute function public.set_updated_at();

-- completions
create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  completed_on date not null,
  amount integer not null default 1 check (amount between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, user_id, completed_on)
);
create index habit_completions_user_idx on public.habit_completions(user_id, completed_on);
grant select, insert, update, delete on public.habit_completions to authenticated;
grant all on public.habit_completions to service_role;
alter table public.habit_completions enable row level security;
create policy "own completions select" on public.habit_completions for select to authenticated using (auth.uid() = user_id);
create policy "own completions insert" on public.habit_completions for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "own completions update" on public.habit_completions for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "own completions delete" on public.habit_completions for delete to authenticated using (auth.uid() = user_id);
create trigger habit_completions_updated before update on public.habit_completions for each row execute function public.set_updated_at();

-- no future-dated completions (trigger, since it depends on current date)
create or replace function public.validate_completion_date()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.completed_on > (current_date + 1) then
    raise exception 'Cannot log a completion for a future date';
  end if;
  return new;
end; $$;
create trigger habit_completions_validate before insert or update on public.habit_completions for each row execute function public.validate_completion_date();

-- achievements catalog (read-only to users)
create table public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  xp integer not null default 0,
  sort_order integer not null default 0
);
grant select on public.achievements to authenticated;
grant all on public.achievements to service_role;
alter table public.achievements enable row level security;
create policy "achievements readable" on public.achievements for select to authenticated using (true);
insert into public.achievements (id, title, description, icon, xp, sort_order) values
  ('first-habit','Fresh Start','Create your first habit','Sprout',20,1),
  ('first-done','First Check','Complete a habit for the first time','CircleCheck',25,2),
  ('perfect-day','Perfect Day','Complete every habit in a day','Sun',40,3),
  ('streak-3','Warming Up','Reach a 3 day streak','Flame',30,4),
  ('streak-7','On Fire','Reach a 7 day streak','Zap',75,5),
  ('five-habits','Architect','Track 5 habits at once','LayoutGrid',40,6),
  ('completions-50','Half Century','Log 50 completions','Medal',100,7),
  ('streak-30','Unstoppable','Reach a 30 day streak','Trophy',250,8),
  ('completions-100','Centurion','Log 100 completions','Crown',300,9),
  ('perfect-10','Flow State','Have 10 perfect days','Sparkles',200,10);

-- user_achievements
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);
grant select, insert, delete on public.user_achievements to authenticated;
grant all on public.user_achievements to service_role;
alter table public.user_achievements enable row level security;
create policy "own ua select" on public.user_achievements for select to authenticated using (auth.uid() = user_id);
create policy "own ua insert" on public.user_achievements for insert to authenticated with check (auth.uid() = user_id);
create policy "own ua delete" on public.user_achievements for delete to authenticated using (auth.uid() = user_id);