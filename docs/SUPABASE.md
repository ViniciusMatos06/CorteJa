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

## 3. Autorizar o e-mail do cabeleireiro

Só e-mails autorizados conseguem criar conta (o banco recusa qualquer outro, inclusive pelo botão *Add user* do Supabase).

1. No **SQL Editor** → **New query**, cole o conteúdo de [`supabase/create_admin.sql`](../supabase/create_admin.sql).
2. Clique em **Run**. A primeira consulta de conferência deve listar `marciojvi@gmail.com`.

Para trocar ou adicionar um e-mail, altere o `insert into public.admin_allowlist` desse arquivo (e a constante `BARBER_EMAIL` em `src/services/adminService.ts`).

## 4. Deixar o cadastro e a confirmação ligados

1. **Authentication** → **Sign In / Providers** → **Email**.
2. **Allow new users to sign up**: ligado (é o que permite a tela de cadastro funcionar).
3. **Confirm email**: ligado. **Não desligue**: a permissão de administrador só é dada depois que o e-mail é confirmado, garantindo que só o dono da caixa de entrada vire admin.
4. Em **Authentication** → **URL Configuration** → **Redirect URLs**, adicione `http://localhost:5173/**` (e o endereço da Vercel depois do deploy, passo 7). É para lá que o link de confirmação leva.

## 5. Criar a conta do cabeleireiro

1. Abra `/admin/cadastro` (ou clique em **Criar conta** na tela de login).
2. Ele informa o e-mail autorizado e escolhe a própria senha (mínimo 8 caracteres).
3. Ele abre o e-mail de confirmação do Supabase e clica no link.
4. Pronto: ele já entra no painel com e-mail e senha. A conta foi adicionada a `admin_users` automaticamente.

> Opcional, depois que a conta existir: desligar **Allow new users to sign up**. Ninguém mais conseguiria se cadastrar mesmo assim (só o e-mail autorizado passa, e ele já existe), mas é uma camada extra. Com o cadastro desligado, a tela `/admin/cadastro` mostra um aviso.

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
2. Entre com o e-mail e a senha criados no passo 5.
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
| "Acesso não autorizado" após login | O e-mail não foi confirmado ou não está em `admin_allowlist`; rode `create_admin.sql` de novo (passo 3) |
| "Este e-mail não tem permissão para criar conta" | O e-mail não está em `admin_allowlist` (passo 3) |
| Link de confirmação abre página errada | Falta o endereço em **Redirect URLs** (passos 4 e 7) |
| Calendário sem nenhum dia disponível | Nenhum dia de trabalho marcado, expediente muito curto, ou todos os dias bloqueados |
| "Agendamentos indisponíveis no momento" | Nenhum serviço ativo cadastrado |
| `extension "btree_gist" is not available` | Raro; ative em **Database → Extensions → btree_gist** e rode o schema de novo |
