-- Libera o acesso ao painel para o usuário do cabeleireiro.
-- 1) Crie o usuário em Authentication > Users > Add user (e-mail + senha).
-- 2) Troque o e-mail abaixo e execute no SQL Editor.

insert into public.admin_users (user_id)
select id from auth.users where email = 'SEU-EMAIL@exemplo.com'
on conflict (user_id) do nothing;

-- Conferir:
select u.email from public.admin_users a join auth.users u on u.id = a.user_id;
