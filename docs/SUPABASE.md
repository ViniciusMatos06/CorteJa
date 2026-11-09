# Tutorial — Configurando o Supabase

Tempo estimado: 10 minutos.

## 1. Criar o projeto

1. Acesse <https://supabase.com> e entre (pode usar a conta do GitHub).
2. Clique em **New project**.
3. Preencha:
   - **Name:** `cabeleireiro-agenda` (qualquer nome)
   - **Database Password:** gere uma senha forte e guarde-a
   - **Region:** `South America (São Paulo)` — menor latência para clientes no Brasil
4. Clique em **Create new project** e aguarde a criação (1–2 minutos).

## 2. Criar o banco de dados

1. No menu lateral, abra **SQL Editor** → **New query**.
2. Copie **todo** o conteúdo de [`supabase/schema.sql`](../supabase/schema.sql), cole e clique em **Run**.
3. Deve aparecer `Success. No rows returned`.

Pronto: tabelas, políticas RLS, funções de disponibilidade e a proteção contra reservas duplicadas foram criadas. O script pode ser executado novamente sem perder dados (útil após atualizações).

> Opcional: execute [`supabase/seed_services.sql`](../supabase/seed_services.sql) para criar três serviços iniciais. Você também pode cadastrá-los pelo painel depois.

## 3. Bloquear cadastros públicos

O painel usa login, mas **ninguém além do cabeleireiro deve conseguir criar conta**.

1. Vá em **Authentication** → **Sign In / Providers** (em versões antigas: *Providers* / *Settings*).
2. Desative **Allow new users to sign up**.
3. Salve.

> Mesmo que alguém crie uma conta, ela **não** acessa o painel: só usuários presentes na tabela `admin_users` têm permissão (passo 5). Desligar o cadastro é uma camada extra.

## 4. Criar o usuário do cabeleireiro

1. Vá em **Authentication** → **Users** → **Add user** → **Create new user**.
2. Informe o e-mail e uma senha forte.
3. Marque **Auto Confirm User** (se a opção aparecer).
4. Clique em **Create user**.

## 5. Dar permissão de administrador

1. Volte ao **SQL Editor** → **New query**.
2. Cole o conteúdo de [`supabase/create_admin.sql`](../supabase/create_admin.sql).
3. Troque `SEU-EMAIL@exemplo.com` pelo e-mail criado no passo 4.
4. Clique em **Run**. A consulta final deve listar o e-mail.

## 6. Pegar as credenciais para o frontend

1. Vá em **Project Settings** → **API** (ou **API Keys**).
2. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - Chave **anon public** (ou **Publishable key**, `sb_publishable_…`) → `VITE_SUPABASE_ANON_KEY`
3. Crie o arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://abcdefghij.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> ❌ **Não** use a chave `service_role` / **Secret key**. Ela ignora o RLS e não pode ir para o navegador.

## 7. Configurar URLs de autenticação (após o deploy)

Depois de publicar na Vercel:

1. **Authentication** → **URL Configuration**.
2. **Site URL:** `https://seu-projeto.vercel.app` (ou seu domínio).
3. Em **Redirect URLs**, adicione `https://seu-projeto.vercel.app/**` e `http://localhost:5173/**`.

## 8. Primeiro acesso

1. Rode o projeto (`npm run dev`) e abra `http://localhost:5173/admin`.
2. Entre com o e-mail e senha do cabeleireiro.
3. Em **Agenda**, configure dias, horários, duração e almoço e clique em **Salvar configurações**.
4. Em **Serviços**, cadastre pelo menos um serviço ativo.
5. Abra `http://localhost:5173/` e faça uma solicitação de teste. Ela aparecerá como **Pendente** no painel. Depois recuse-a para liberar o horário.

---

## Conferindo a segurança (opcional)

No SQL Editor, rode como se fosse um visitante anônimo:

```sql
set role anon;
select * from appointments;          -- deve dar: permission denied
select * from get_available_slots(current_date + 1);  -- deve listar só horários
reset role;
```

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "O sistema ainda não foi configurado" na página pública | Variáveis `VITE_SUPABASE_*` ausentes; reinicie o `npm run dev` após criar o `.env.local` |
| "Acesso não autorizado" após login | O usuário não está em `admin_users` (passo 5) |
| Calendário sem nenhum dia disponível | Nenhum dia de trabalho marcado, expediente muito curto, ou todos os dias bloqueados |
| "Agendamentos indisponíveis no momento" | Nenhum serviço ativo cadastrado |
| `extension "btree_gist" is not available` | Raro; ative em **Database → Extensions → btree_gist** e rode o schema de novo |
