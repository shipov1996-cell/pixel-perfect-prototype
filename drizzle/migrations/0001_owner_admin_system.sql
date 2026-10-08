
create type public.app_role as enum ('owner','admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create unique index user_roles_single_owner on public.user_roles (role) where role = 'owner';
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

alter table public.profiles add column status text not null default 'active';
alter table public.profiles add column is_test_account boolean not null default false;
alter table public.profiles add constraint profiles_status_chk check (status in ('active','suspended'));

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  actor_user_id uuid,
  event_type text not null,
  target_type text not null default '',
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_user_idx on public.audit_logs (user_id);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

create table public.app_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  source text not null default 'client',
  message text not null,
  route text not null default '',
  created_at timestamptz not null default now(),
  constraint app_errors_len check (char_length(message) <= 500 and char_length(route) <= 200 and char_length(source) <= 40)
);
create index app_errors_created_idx on public.app_errors (created_at desc);
grant select, insert on public.app_errors to authenticated;
grant all on public.app_errors to service_role;
alter table public.app_errors enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','admin'))
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select case when public.has_role(auth.uid(),'owner') then 'owner'
              when public.has_role(auth.uid(),'admin') then 'admin' else 'user' end
$$;

create policy "own or staff roles select" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read habits" on public.habits for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read completions" on public.habit_completions for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read user achievements" on public.user_achievements for select to authenticated using (public.is_staff(auth.uid()));

create policy "staff read audit" on public.audit_logs for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read errors" on public.app_errors for select to authenticated using (public.is_staff(auth.uid()));
create policy "insert own errors" on public.app_errors for insert to authenticated with check (user_id = auth.uid());

-- Users cannot change their own status / test flag
create or replace function public.protect_profile_admin_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('habitflow.admin_op', true) is distinct from 'on'
     and (new.status is distinct from old.status or new.is_test_account is distinct from old.is_test_account) then
    new.status := old.status; new.is_test_account := old.is_test_account;
  end if;
  return new;
end $$;
create trigger profiles_protect_admin_fields before update on public.profiles
  for each row execute function public.protect_profile_admin_fields();

-- Audit writer
create or replace function public.write_audit(_user uuid, _event text, _ttype text, _tid text, _meta jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if current_setting('habitflow.skip_audit', true) = 'on' then return; end if;
  insert into public.audit_logs (user_id, actor_user_id, event_type, target_type, target_id, metadata)
  values (_user, coalesce(auth.uid(), _user), _event, _ttype, _tid, coalesce(_meta,'{}'::jsonb));
end $$;
revoke execute on function public.write_audit(uuid,text,text,text,jsonb) from public, anon, authenticated;

create or replace function public.audit_habits() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit(new.user_id,'habit_created','habit',new.id::text, jsonb_build_object('name',new.name,'category',new.category));
  elsif tg_op = 'UPDATE' then
    if new.archived and not old.archived then
      perform public.write_audit(new.user_id,'habit_archived','habit',new.id::text, jsonb_build_object('name',new.name));
    elsif row(new.name,new.icon,new.category,new.color,new.description,new.frequency_type,new.weekdays,new.interval_days,new.target,new.unit,new.start_date,new.archived)
       is distinct from row(old.name,old.icon,old.category,old.color,old.description,old.frequency_type,old.weekdays,old.interval_days,old.target,old.unit,old.start_date,old.archived) then
      perform public.write_audit(new.user_id,'habit_updated','habit',new.id::text, jsonb_build_object('name',new.name));
    end if;
  else
    perform public.write_audit(old.user_id,'habit_deleted','habit',old.id::text, jsonb_build_object('name',old.name));
  end if;
  return null;
end $$;
create trigger habits_audit after insert or update or delete on public.habits for each row execute function public.audit_habits();

create or replace function public.audit_completions() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  if tg_op = 'DELETE' then
    perform public.write_audit(old.user_id,'habit_uncompleted','habit',old.habit_id::text, jsonb_build_object('date',old.completed_on));
  elsif tg_op = 'INSERT' or new.amount is distinct from old.amount then
    perform public.write_audit(new.user_id,'habit_completed','habit',new.habit_id::text, jsonb_build_object('date',new.completed_on,'amount',new.amount));
  end if;
  return null;
end $$;
create trigger completions_audit after insert or update or delete on public.habit_completions for each row execute function public.audit_completions();

create or replace function public.audit_achievements() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_audit(new.user_id,'achievement_unlocked','achievement',new.achievement_id, '{}'::jsonb);
  return null;
end $$;
create trigger achievements_audit after insert on public.user_achievements for each row execute function public.audit_achievements();

create or replace function public.audit_profiles() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.display_name is distinct from old.display_name then
    perform public.write_audit(new.id,'profile_updated','profile',new.id::text, '{}'::jsonb);
  end if;
  return null;
end $$;
create trigger profiles_audit after update on public.profiles for each row execute function public.audit_profiles();

create or replace function public.audit_settings() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if row(new.theme,new.notifications,new.daily_summary,new.week_starts_monday,new.day_start_hour)
     is distinct from row(old.theme,old.notifications,old.daily_summary,old.week_starts_monday,old.day_start_hour) then
    perform public.write_audit(new.user_id,'settings_changed','settings',new.user_id::text, jsonb_build_object('theme',new.theme));
  end if;
  return null;
end $$;
create trigger settings_audit after update on public.user_settings for each row execute function public.audit_settings();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(left(new.raw_user_meta_data->>'display_name', 60), ''))
    on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  insert into public.audit_logs (user_id, actor_user_id, event_type, target_type, target_id)
    values (new.id, new.id, 'user_registered', 'user', new.id::text);
  return new;
end; $function$;

insert into public.user_roles (user_id, role) select id, 'user' from auth.users on conflict do nothing;

create or replace function public.log_auth_event(_event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or _event not in ('user_signed_in','user_signed_out') then
    raise exception 'Not allowed';
  end if;
  perform public.write_audit(auth.uid(), _event, 'user', auth.uid()::text, '{}'::jsonb);
end $$;

-- Admin RPCs
create or replace function public.admin_list_users()
returns table (id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz,
  status text, is_test_account boolean, role text, habits bigint, completions bigint, last_activity timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Access denied'; end if;
  return query
  select u.id, u.email::text, coalesce(p.display_name,''), u.created_at, u.last_sign_in_at,
    coalesce(p.status,'active'), coalesce(p.is_test_account,false),
    case when exists(select 1 from user_roles r where r.user_id=u.id and r.role='owner') then 'owner'
         when exists(select 1 from user_roles r where r.user_id=u.id and r.role='admin') then 'admin' else 'user' end,
    (select count(*) from habits h where h.user_id=u.id),
    (select count(*) from habit_completions c where c.user_id=u.id),
    (select max(a.created_at) from audit_logs a where a.user_id=u.id)
  from auth.users u left join profiles p on p.id=u.id
  order by u.created_at desc;
end $$;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Access denied'; end if;
  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'new_today', (select count(*) from auth.users where created_at >= date_trunc('day', now())),
    'new_week', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'active_7d', (select count(distinct user_id) from audit_logs where created_at >= now() - interval '7 days' and user_id is not null),
    'active_30d', (select count(distinct user_id) from audit_logs where created_at >= now() - interval '30 days' and user_id is not null),
    'total_habits', (select count(*) from habits),
    'active_habits', (select count(*) from habits where not archived),
    'total_completions', (select count(*) from habit_completions),
    'completions_7d', (select count(*) from habit_completions where completed_on >= current_date - 6)
  ) into r;
  return r;
end $$;

create or replace function public.admin_analytics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Access denied'; end if;
  with days as (select generate_series(current_date - 29, current_date, interval '1 day')::date d)
  select jsonb_build_object(
    'daily', (select jsonb_agg(jsonb_build_object('date', d,
        'registrations', (select count(*) from auth.users where created_at::date = d),
        'habits', (select count(*) from habits where created_at::date = d),
        'completions', (select count(*) from habit_completions where completed_on = d),
        'active', (select count(distinct user_id) from audit_logs where created_at::date = d and user_id is not null)
      ) order by d) from days),
    'categories', (select coalesce(jsonb_agg(jsonb_build_object('category', category, 'count', n) order by n desc), '[]'::jsonb)
        from (select category, count(*) n from habits group by category) x),
    'retention', (select jsonb_build_object(
        'eligible', count(*),
        'retained', count(*) filter (where exists (select 1 from audit_logs a where a.user_id = u.id and a.created_at >= u.created_at + interval '7 days'))
      ) from auth.users u where u.created_at <= now() - interval '7 days')
  ) into r;
  return r;
end $$;

create or replace function public.admin_user_detail(_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Access denied'; end if;
  select jsonb_build_object(
    'id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
    'email_confirmed', u.email_confirmed_at is not null,
    'display_name', coalesce(p.display_name,''), 'status', coalesce(p.status,'active'), 'is_test_account', coalesce(p.is_test_account,false),
    'role', case when exists(select 1 from user_roles x where x.user_id=u.id and x.role='owner') then 'owner'
                 when exists(select 1 from user_roles x where x.user_id=u.id and x.role='admin') then 'admin' else 'user' end,
    'last_activity', (select max(a.created_at) from audit_logs a where a.user_id=u.id)
  ) into r from auth.users u left join profiles p on p.id=u.id where u.id=_uid;
  return r;
end $$;

create or replace function public.admin_set_status(_uid uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Access denied'; end if;
  if _status not in ('active','suspended') then raise exception 'Invalid status'; end if;
  if _uid = auth.uid() then raise exception 'You cannot change your own status'; end if;
  if public.has_role(_uid,'owner') then raise exception 'The owner cannot be suspended'; end if;
  if public.has_role(_uid,'admin') and not public.has_role(auth.uid(),'owner') then raise exception 'Only the owner can suspend admins'; end if;
  perform set_config('habitflow.admin_op','on',true);
  update profiles set status=_status where id=_uid;
  update auth.users set banned_until = case when _status='suspended' then 'infinity'::timestamptz else null end where id=_uid;
  perform public.write_audit(_uid, case when _status='suspended' then 'account_suspended' else 'account_reactivated' end, 'user', _uid::text, '{}'::jsonb);
end $$;

create or replace function public.admin_set_admin(_uid uuid, _make_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'owner') then raise exception 'Only the owner can change roles'; end if;
  if public.has_role(_uid,'owner') then raise exception 'The owner role cannot be changed'; end if;
  if _make_admin then insert into user_roles(user_id, role) values (_uid,'admin') on conflict do nothing;
  else delete from user_roles where user_id=_uid and role='admin'; end if;
  perform public.write_audit(_uid,'role_changed','user',_uid::text, jsonb_build_object('role', case when _make_admin then 'admin' else 'user' end));
end $$;

create or replace function public.admin_set_test_flag(_uid uuid, _flag boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'owner') then raise exception 'Only the owner can do this'; end if;
  perform set_config('habitflow.admin_op','on',true);
  update profiles set is_test_account=_flag where id=_uid;
end $$;

create or replace function public.admin_delete_user(_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare em text;
begin
  if not public.has_role(auth.uid(),'owner') then raise exception 'Only the owner can delete accounts'; end if;
  if _uid = auth.uid() or public.has_role(_uid,'owner') then raise exception 'The owner account cannot be deleted'; end if;
  select email into em from auth.users where id=_uid;
  if em is null then raise exception 'User not found'; end if;
  perform set_config('habitflow.skip_audit','on',true);
  delete from habits where user_id=_uid;
  delete from user_achievements where user_id=_uid;
  delete from user_settings where user_id=_uid;
  delete from profiles where id=_uid;
  delete from auth.users where id=_uid;
  perform set_config('habitflow.skip_audit','off',true);
  perform public.write_audit(_uid,'account_deleted','user',_uid::text, jsonb_build_object('email_domain', split_part(em,'@',2)));
end $$;

revoke execute on function public.admin_list_users(), public.admin_overview(), public.admin_analytics(), public.admin_user_detail(uuid),
  public.admin_set_status(uuid,text), public.admin_set_admin(uuid,boolean), public.admin_set_test_flag(uuid,boolean),
  public.admin_delete_user(uuid), public.log_auth_event(text), public.my_role() from public, anon;
grant execute on function public.admin_list_users(), public.admin_overview(), public.admin_analytics(), public.admin_user_detail(uuid),
  public.admin_set_status(uuid,text), public.admin_set_admin(uuid,boolean), public.admin_set_test_flag(uuid,boolean),
  public.admin_delete_user(uuid), public.log_auth_event(text), public.my_role() to authenticated;
