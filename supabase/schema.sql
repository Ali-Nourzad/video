create extension if not exists pgcrypto;

do $$ begin
if not exists(select 1 from pg_type where typname='user_role') then create type public.user_role as enum('customer','admin'); end if;
if not exists(select 1 from pg_type where typname='order_status') then create type public.order_status as enum('new','review','approved','production','editing','revision','ready','completed','cancelled'); end if;
if not exists(select 1 from pg_type where typname='production_model') then create type public.production_model as enum('edit_only','voice_ready','visual_ready','script_ready','full_production'); end if;
if not exists(select 1 from pg_type where typname='payment_status') then create type public.payment_status as enum('unpaid','pending','paid','refunded'); end if;
end $$;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 email text,
 first_name text,
 last_name text,
 phone text,
 address text,
 avatar_url text,
 role public.user_role not null default 'customer',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean language sql security definer set search_path=public stable as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

create table if not exists public.video_orders(
 id uuid primary key default gen_random_uuid(),
 order_number text not null unique,
 customer_id uuid not null references public.profiles(id) on delete restrict,
 title text not null,
 subject text not null,
 description text not null,
 estimated_duration text,
 production_model public.production_model not null,
 needs_script boolean not null default false,
 needs_voice boolean not null default false,
 needs_visuals boolean not null default false,
 needs_editing boolean not null default true,
 aspect_ratio text,
 output_quality text,
 video_style text,
 reference_links text,
 special_notes text,
 status public.order_status not null default 'new',
 estimated_cost numeric(12,2),
 final_cost numeric(12,2),
 payment_status public.payment_status not null default 'unpaid',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.order_files(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.video_orders(id) on delete cascade,
 uploaded_by uuid not null references public.profiles(id) on delete restrict,
 file_name text not null,
 file_path text not null,
 file_url text not null,
 file_size bigint,
 mime_type text,
 file_role text,
 created_at timestamptz not null default now()
);

create table if not exists public.order_messages(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.video_orders(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete restrict,
 message text not null,
 created_at timestamptz not null default now()
);

create table if not exists public.order_revisions(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.video_orders(id) on delete cascade,
 revision_number integer not null,
 file_id uuid references public.order_files(id) on delete set null,
 note text,
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 unique(order_id,revision_number)
);

create table if not exists public.order_status_history(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.video_orders(id) on delete cascade,
 status public.order_status not null,
 changed_by uuid not null references public.profiles(id) on delete restrict,
 note text,
 created_at timestamptz not null default now()
);

create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 order_id uuid references public.video_orders(id) on delete cascade,
 title text not null,
 message text not null,
 is_read boolean not null default false,
 created_at timestamptz not null default now()
);

create or replace function public.make_order_number() returns trigger language plpgsql as $$ begin if new.order_number is null or new.order_number='' then new.order_number:='TV-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)); end if; return new; end $$;
drop trigger if exists make_order_number on public.video_orders;
create trigger make_order_number before insert on public.video_orders for each row execute function public.make_order_number();

create or replace function public.set_needs() returns trigger language plpgsql as $$ begin new.needs_script=new.production_model='full_production'; new.needs_voice=new.production_model in('visual_ready','script_ready','full_production'); new.needs_visuals=new.production_model in('voice_ready','script_ready','full_production'); new.needs_editing=true; return new; end $$;
drop trigger if exists set_order_needs on public.video_orders;
create trigger set_order_needs before insert or update of production_model on public.video_orders for each row execute function public.set_needs();

create or replace function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,email,first_name,last_name,phone) values(new.id,new.email,new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'last_name',new.raw_user_meta_data->>'phone') on conflict(id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();

create index if not exists orders_customer_idx on public.video_orders(customer_id);
create index if not exists orders_status_idx on public.video_orders(status);
create index if not exists files_order_idx on public.order_files(order_id);
create index if not exists messages_order_idx on public.order_messages(order_id);

alter table public.profiles enable row level security;
alter table public.video_orders enable row level security;
alter table public.order_files enable row level security;
alter table public.order_messages enable row level security;
alter table public.order_revisions enable row level security;
alter table public.order_status_history enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());

drop policy if exists orders_insert on public.video_orders;
create policy orders_insert on public.video_orders for insert to authenticated with check(customer_id=auth.uid() or public.is_admin());
drop policy if exists orders_select on public.video_orders;
create policy orders_select on public.video_orders for select to authenticated using(customer_id=auth.uid() or public.is_admin());
drop policy if exists orders_update on public.video_orders;
create policy orders_update on public.video_orders for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists orders_delete on public.video_orders;
create policy orders_delete on public.video_orders for delete to authenticated using(public.is_admin());

drop policy if exists files_select on public.order_files;
create policy files_select on public.order_files for select to authenticated using(exists(select 1 from public.video_orders o where o.id=order_id and(o.customer_id=auth.uid() or public.is_admin())));
drop policy if exists files_insert on public.order_files;
create policy files_insert on public.order_files for insert to authenticated with check((uploaded_by=auth.uid() and exists(select 1 from public.video_orders o where o.id=order_id and o.customer_id=auth.uid())) or public.is_admin());

drop policy if exists messages_select on public.order_messages;
create policy messages_select on public.order_messages for select to authenticated using(exists(select 1 from public.video_orders o where o.id=order_id and(o.customer_id=auth.uid() or public.is_admin())));
drop policy if exists messages_insert on public.order_messages;
create policy messages_insert on public.order_messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.video_orders o where o.id=order_id and(o.customer_id=auth.uid() or public.is_admin())));

drop policy if exists revisions_select on public.order_revisions;
create policy revisions_select on public.order_revisions for select to authenticated using(exists(select 1 from public.video_orders o where o.id=order_id and(o.customer_id=auth.uid() or public.is_admin())));
drop policy if exists revisions_admin on public.order_revisions;
create policy revisions_admin on public.order_revisions for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists history_select on public.order_status_history;
create policy history_select on public.order_status_history for select to authenticated using(exists(select 1 from public.video_orders o where o.id=order_id and(o.customer_id=auth.uid() or public.is_admin())));
drop policy if exists history_insert on public.order_status_history;
create policy history_insert on public.order_status_history for insert to authenticated with check(public.is_admin());

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());

insert into storage.buckets(id,name,public) values('video-files','video-files',true) on conflict(id) do nothing;
drop policy if exists video_upload on storage.objects;
create policy video_upload on storage.objects for insert to authenticated with check(bucket_id='video-files' and (storage.foldername(name))[1]=auth.uid()::text or public.is_admin());
drop policy if exists video_read on storage.objects;
create policy video_read on storage.objects for select to authenticated using(bucket_id='video-files' and((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
drop policy if exists video_delete on storage.objects;
create policy video_delete on storage.objects for delete to authenticated using(bucket_id='video-files' and((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
