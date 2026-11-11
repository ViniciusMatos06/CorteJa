-- Autoriza o e-mail do cabeleireiro. Rode no SQL Editor depois do schema.sql.
-- Depois disso ele cria a própria senha em /admin/cadastro e confirma o e-mail;
-- a permissão de administrador é dada automaticamente na confirmação.

insert into public.admin_allowlist (email)
values ('marciojvi@gmail.com')
on conflict (email) do nothing;

-- Se a conta já existir e estiver confirmada, libera o painel agora.
insert into public.admin_users (user_id)
select id from auth.users
where lower(email) = 'marciojvi@gmail.com' and email_confirmed_at is not null
on conflict (user_id) do nothing;

-- Conferir:
select email from public.admin_allowlist;
select u.email from public.admin_users a join auth.users u on u.id = a.user_id;
