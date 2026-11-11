-- =============================================================================
-- Cabeleireiro a Domicílio — schema do banco (Supabase / PostgreSQL)
--
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- O script é idempotente: pode ser executado novamente sem perder dados.
-- =============================================================================

create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.appointment_status as enum ('pending', 'confirmed', 'declined', 'cancelled');
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Administradores
-- Somente usuários listados aqui têm acesso ao painel. Criar uma conta no
-- Supabase Auth NÃO dá acesso administrativo por si só.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Cadastro do cabeleireiro (tela /admin/cadastro)
-- Só e-mails listados em admin_allowlist conseguem criar conta no Supabase Auth
-- (vale também para o botão "Add user" do painel do Supabase). Quando o e-mail
-- é confirmado, o usuário entra em admin_users automaticamente.
-- Preencha a lista com supabase/create_admin.sql.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_allowlist (
  email      text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);

create or replace function public.guard_auth_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_allowlist where email = lower(btrim(new.email))) then
    raise exception 'Este e-mail não tem permissão para criar conta.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function public.grant_admin_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Só depois de confirmar o e-mail: quem não tem acesso à caixa de entrada
  -- não vira administrador, mesmo que se cadastre primeiro com o e-mail certo.
  if new.email_confirmed_at is not null
     and exists (select 1 from public.admin_allowlist where email = lower(btrim(new.email))) then
    insert into public.admin_users (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists guard_auth_signup on auth.users;
create trigger guard_auth_signup
  before insert on auth.users
  for each row execute function public.guard_auth_signup();

drop trigger if exists grant_admin_on_confirm on auth.users;
create trigger grant_admin_on_confirm
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.grant_admin_on_confirm();

-- -----------------------------------------------------------------------------
-- Configurações de funcionamento (linha única, id = 1)
-- work_days usa o padrão do PostgreSQL: 0 = domingo ... 6 = sábado
-- -----------------------------------------------------------------------------
create table if not exists public.business_settings (
  id                  smallint primary key default 1 check (id = 1),
  business_name       text        not null default 'Cabeleireiro a Domicílio'
                                  check (char_length(business_name) between 2 and 80),
  timezone            text        not null default 'America/Sao_Paulo',
  work_days           smallint[]  not null default '{1,2,3,4,5,6}'
                                  check (work_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  day_start           time        not null default '09:00',
  day_end             time        not null default '19:00',
  slot_minutes        integer     not null default 60 check (slot_minutes between 15 and 240),
  min_notice_minutes  integer     not null default 60 check (min_notice_minutes between 0 and 2880),
  booking_window_days integer     not null default 30 check (booking_window_days between 1 and 120),
  updated_at          timestamptz not null default now(),
  check (day_end > day_start)
);

insert into public.business_settings (id) values (1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Serviços oferecidos
-- -----------------------------------------------------------------------------
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (char_length(btrim(name)) between 2 and 80),
  description text        check (char_length(description) <= 300),
  price       numeric(10,2) check (price >= 0),
  active      boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Intervalos recorrentes (almoço, pausas)
-- weekday nulo = vale para todos os dias de trabalho
-- -----------------------------------------------------------------------------
create table if not exists public.breaks (
  id         uuid primary key default gen_random_uuid(),
  label      text        not null default 'Intervalo' check (char_length(label) between 1 and 60),
  weekday    smallint    check (weekday between 0 and 6),
  start_time time        not null,
  end_time   time        not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- -----------------------------------------------------------------------------
-- Bloqueios manuais de datas / horários
-- start_time e end_time nulos = dia inteiro bloqueado
-- -----------------------------------------------------------------------------
create table if not exists public.blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  block_date date        not null,
  start_time time,
  end_time   time,
  reason     text        check (char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists blocked_slots_date_idx on public.blocked_slots (block_date);

-- -----------------------------------------------------------------------------
-- Agendamentos
-- A restrição de exclusão impede, no nível do banco, que dois agendamentos
-- ativos (pendente ou confirmado) se sobreponham — mesmo com requisições
-- simultâneas. Recusados e cancelados não ocupam horário.
-- -----------------------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  client_name      text not null check (char_length(client_name) between 3 and 120),
  client_whatsapp  text not null check (client_whatsapp ~ '^[0-9]{12,13}$'),
  client_address   text not null check (char_length(client_address) between 8 and 300),
  service_id       uuid references public.services (id) on delete set null,
  service_name     text not null,
  service_price    numeric(10,2),
  appointment_date date not null,
  start_time       time not null,
  end_time         time not null,
  status           public.appointment_status not null default 'pending',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_time > start_time),
  constraint appointments_no_overlap exclude using gist (
    tsrange(appointment_date + start_time, appointment_date + end_time, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);

create index if not exists appointments_date_idx   on public.appointments (appointment_date);
create index if not exists appointments_status_idx on public.appointments (status);

-- Endereço em partes (preenchido a partir do CEP). client_address continua
-- existindo como texto completo, montado por request_appointment, para exibição
-- e link do mapa. As colunas são opcionais só por causa de agendamentos antigos,
-- criados antes da divisão; request_appointment exige e valida todas.
alter table public.appointments add column if not exists address_cep          text;
alter table public.appointments add column if not exists address_street       text;
alter table public.appointments add column if not exists address_number       text;
alter table public.appointments add column if not exists address_complement   text;
alter table public.appointments add column if not exists address_neighborhood text;
alter table public.appointments add column if not exists address_city         text;
alter table public.appointments add column if not exists address_state        text;

alter table public.appointments drop constraint if exists appointments_address_cep_format;
alter table public.appointments add constraint appointments_address_cep_format
  check (address_cep is null or address_cep ~ '^[0-9]{8}$');
alter table public.appointments drop constraint if exists appointments_address_state_format;
alter table public.appointments add constraint appointments_address_state_format
  check (address_state is null or address_state ~ '^[A-Z]{2}$');

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists appointments_touch on public.appointments;
create trigger appointments_touch
  before update on public.appointments
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.business_settings;
create trigger settings_touch
  before update on public.business_settings
  for each row execute function public.touch_updated_at();

-- Transições de status permitidas:
--   pendente   -> confirmado | recusado
--   confirmado -> cancelado
create or replace function public.validate_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if (old.status = 'pending'   and new.status in ('confirmed', 'declined'))
  or (old.status = 'confirmed' and new.status = 'cancelled') then
    return new;
  end if;

  raise exception 'Mudança de status não permitida (% → %).', old.status, new.status
    using errcode = 'P0001';
end $$;

drop trigger if exists appointments_status_transition on public.appointments;
create trigger appointments_status_transition
  before update of status on public.appointments
  for each row execute function public.validate_status_transition();

-- -----------------------------------------------------------------------------
-- Disponibilidade
-- Retorna somente horários livres de uma data (nenhum dado pessoal).
-- -----------------------------------------------------------------------------
create or replace function public.get_available_slots(p_date date)
returns table (slot_start time, slot_end time)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s     public.business_settings%rowtype;
  v_now timestamp;
  v_dow smallint;
  v_len interval;
begin
  select * into s from public.business_settings where id = 1;
  if not found or p_date is null then
    return;
  end if;

  v_now := now() at time zone s.timezone;
  v_dow := extract(dow from p_date)::smallint;
  v_len := make_interval(mins => s.slot_minutes);

  if p_date < v_now::date
     or p_date > v_now::date + s.booking_window_days
     or not (v_dow = any (s.work_days))
     or exists (select 1 from public.blocked_slots b
                where b.block_date = p_date and b.start_time is null) then
    return;
  end if;

  return query
  with grid as (
    select g::time as st, (g + v_len)::time as en
    from generate_series(p_date + s.day_start, p_date + s.day_end - v_len, v_len) as g
  )
  select grid.st, grid.en
  from grid
  where (p_date + grid.st) >= v_now + make_interval(mins => s.min_notice_minutes)
    and not exists (
      select 1 from public.breaks br
      where (br.weekday is null or br.weekday = v_dow)
        and br.start_time < grid.en and br.end_time > grid.st)
    and not exists (
      select 1 from public.blocked_slots b
      where b.block_date = p_date
        and b.start_time < grid.en and b.end_time > grid.st)
    and not exists (
      select 1 from public.appointments a
      where a.appointment_date = p_date
        and a.status in ('pending', 'confirmed')
        and a.start_time < grid.en and a.end_time > grid.st)
  order by grid.st;
end $$;

-- Datas (dentro de um intervalo) que têm pelo menos um horário livre.
create or replace function public.get_available_dates(p_from date, p_to date)
returns setof date
language sql
stable
security definer
set search_path = public
as $$
  select d::date
  from generate_series(p_from, least(p_to, p_from + 62), interval '1 day') as d
  where exists (select 1 from public.get_available_slots(d::date))
  order by 1;
$$;

-- -----------------------------------------------------------------------------
-- Solicitação de agendamento (único caminho público de escrita)
-- Valida tudo no servidor e insere sempre com status "pending".
-- -----------------------------------------------------------------------------
-- Assinatura antiga (endereço em um único texto).
drop function if exists public.request_appointment(text, text, text, uuid, date, time);

create or replace function public.request_appointment(
  p_client_name          text,
  p_client_whatsapp      text,
  p_address_cep          text,
  p_address_street       text,
  p_address_number       text,
  p_address_complement   text,
  p_address_neighborhood text,
  p_address_city         text,
  p_address_state        text,
  p_service_id           uuid,
  p_date                 date,
  p_start_time           time
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_name    text := regexp_replace(btrim(coalesce(p_client_name, '')), '\s+', ' ', 'g');
  v_phone   text := regexp_replace(coalesce(p_client_whatsapp, ''), '\D', '', 'g');
  v_cep     text := regexp_replace(coalesce(p_address_cep, ''), '\D', '', 'g');
  v_street  text := regexp_replace(btrim(coalesce(p_address_street, '')), '\s+', ' ', 'g');
  v_number  text := regexp_replace(btrim(coalesce(p_address_number, '')), '\s+', ' ', 'g');
  v_compl   text := nullif(regexp_replace(btrim(coalesce(p_address_complement, '')), '\s+', ' ', 'g'), '');
  v_hood    text := regexp_replace(btrim(coalesce(p_address_neighborhood, '')), '\s+', ' ', 'g');
  v_city    text := regexp_replace(btrim(coalesce(p_address_city, '')), '\s+', ' ', 'g');
  v_state   text := upper(btrim(coalesce(p_address_state, '')));
  v_address text;
  v_service public.services%rowtype;
  v_end     time;
  v_id      uuid;
begin
  if char_length(v_name) < 3 or char_length(v_name) > 120 then
    raise exception 'Informe seu nome completo.' using errcode = 'P0001';
  end if;

  if char_length(v_phone) in (10, 11) then
    v_phone := '55' || v_phone;           -- número brasileiro sem DDI
  end if;
  if v_phone !~ '^55[1-9][0-9]{9,10}$' then
    raise exception 'Informe um WhatsApp válido com DDD.' using errcode = 'P0001';
  end if;

  if v_cep !~ '^[0-9]{8}$' then
    raise exception 'Informe um CEP válido com 8 números.' using errcode = 'P0001';
  end if;
  if char_length(v_street) < 2 or char_length(v_street) > 150 then
    raise exception 'Informe a rua do atendimento.' using errcode = 'P0001';
  end if;
  if char_length(v_number) < 1 or char_length(v_number) > 20 then
    raise exception 'Informe o número (ou S/N).' using errcode = 'P0001';
  end if;
  if char_length(coalesce(v_compl, '')) > 80 then
    raise exception 'Complemento muito longo.' using errcode = 'P0001';
  end if;
  if char_length(v_hood) < 2 or char_length(v_hood) > 80 then
    raise exception 'Informe o bairro.' using errcode = 'P0001';
  end if;
  if char_length(v_city) < 2 or char_length(v_city) > 80 then
    raise exception 'Informe a cidade.' using errcode = 'P0001';
  end if;
  if v_state not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
                     'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') then
    raise exception 'Informe um estado (UF) válido.' using errcode = 'P0001';
  end if;

  -- Texto completo; mesmo formato de formatAddress() em src/lib/address.ts.
  v_address := v_street || ', ' || v_number
    || coalesce(' - ' || v_compl, '')
    || ' - ' || v_hood || ', ' || v_city || ' - ' || v_state
    || ', CEP ' || substr(v_cep, 1, 5) || '-' || substr(v_cep, 6, 3);

  select * into v_service from public.services where id = p_service_id and active;
  if not found then
    raise exception 'O serviço selecionado não está disponível.' using errcode = 'P0001';
  end if;

  -- Proteção simples contra abuso: no máximo 3 solicitações pendentes futuras por número.
  if (select count(*) from public.appointments
      where client_whatsapp = v_phone and status = 'pending'
        and appointment_date >= current_date) >= 3 then
    raise exception 'Você já possui solicitações aguardando confirmação. Aguarde o retorno do cabeleireiro.'
      using errcode = 'P0001';
  end if;

  -- Serializa reservas da mesma data; a restrição de exclusão é a garantia final.
  perform pg_advisory_xact_lock(hashtextextended('appointments:' || p_date::text, 0));

  select slot_end into v_end
  from public.get_available_slots(p_date)
  where slot_start = p_start_time;

  if v_end is null then
    raise exception 'Este horário não está mais disponível. Escolha outro horário.'
      using errcode = 'P0001', hint = 'SLOT_UNAVAILABLE';
  end if;

  insert into public.appointments (
    client_name, client_whatsapp, client_address,
    address_cep, address_street, address_number, address_complement,
    address_neighborhood, address_city, address_state,
    service_id, service_name, service_price,
    appointment_date, start_time, end_time, status
  ) values (
    v_name, v_phone, v_address,
    v_cep, v_street, v_number, v_compl,
    v_hood, v_city, v_state,
    v_service.id, v_service.name, v_service.price,
    p_date, p_start_time, v_end, 'pending'
  )
  returning id into v_id;

  return v_id;
exception
  when exclusion_violation then
    raise exception 'Este horário acabou de ser reservado por outra pessoa. Escolha outro horário.'
      using errcode = 'P0001', hint = 'SLOT_UNAVAILABLE';
end $$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.admin_users       enable row level security;
alter table public.admin_allowlist   enable row level security; -- sem policies: ninguém acessa pela API
alter table public.business_settings enable row level security;
alter table public.services          enable row level security;
alter table public.breaks            enable row level security;
alter table public.blocked_slots     enable row level security;
alter table public.appointments      enable row level security;

-- admin_users: cada usuário só enxerga a própria linha; ninguém escreve pela API.
drop policy if exists admin_users_self_select on public.admin_users;
create policy admin_users_self_select on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- business_settings: leitura pública (não contém dados pessoais); escrita só admin.
drop policy if exists settings_public_read on public.business_settings;
create policy settings_public_read on public.business_settings
  for select to anon, authenticated using (true);

drop policy if exists settings_admin_update on public.business_settings;
create policy settings_admin_update on public.business_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- services: público vê apenas ativos; admin vê e gerencia todos.
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon, authenticated using (active or public.is_admin());

drop policy if exists services_admin_write on public.services;
create policy services_admin_write on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- breaks e blocked_slots: somente admin (o público usa get_available_slots).
drop policy if exists breaks_admin_all on public.breaks;
create policy breaks_admin_all on public.breaks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists blocked_admin_all on public.blocked_slots;
create policy blocked_admin_all on public.blocked_slots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- appointments: somente admin lê e altera. Não existe policy de INSERT/DELETE:
-- clientes criam solicitações exclusivamente via request_appointment().
drop policy if exists appointments_admin_select on public.appointments;
create policy appointments_admin_select on public.appointments
  for select to authenticated using (public.is_admin());

drop policy if exists appointments_admin_update on public.appointments;
create policy appointments_admin_update on public.appointments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Privilégios (defesa em profundidade, além do RLS)
-- -----------------------------------------------------------------------------
revoke all on public.appointments, public.blocked_slots, public.breaks, public.admin_users from anon;
revoke insert, update, delete on public.business_settings, public.services from anon;

-- O admin só pode alterar a coluna status de um agendamento.
revoke insert, update, delete on public.appointments from authenticated;
grant select on public.appointments to authenticated;
grant update (status) on public.appointments to authenticated;

revoke insert, update, delete on public.admin_users from authenticated;
revoke all on public.admin_allowlist from anon, authenticated;
revoke execute on function public.guard_auth_signup()      from public, anon, authenticated;
revoke execute on function public.grant_admin_on_confirm() from public, anon, authenticated;

revoke execute on function public.get_available_slots(date)       from public;
revoke execute on function public.get_available_dates(date, date) from public;
revoke execute on function public.request_appointment(text, text, text, text, text, text, text, text, text, uuid, date, time) from public;
revoke execute on function public.is_admin() from public;

grant execute on function public.get_available_slots(date)       to anon, authenticated;
grant execute on function public.get_available_dates(date, date) to anon, authenticated;
grant execute on function public.request_appointment(text, text, text, text, text, text, text, text, text, uuid, date, time) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
