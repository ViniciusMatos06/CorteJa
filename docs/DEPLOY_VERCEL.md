# Tutorial — Deploy na Vercel

Pré-requisito: Supabase configurado ([SUPABASE.md](SUPABASE.md)) e o projeto funcionando localmente.

## 1. Enviar o código para o GitHub

```bash
git init
git add .
git commit -m "Sistema de agendamento"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/cabeleireiro-agenda.git
git push -u origin main
```

> O `.gitignore` já impede o envio de `.env.local`. Confira que nenhuma chave foi commitada.

## 2. Importar na Vercel

1. Acesse <https://vercel.com> e entre com o GitHub.
2. Clique em **Add New…** → **Project**.
3. Selecione o repositório e clique em **Import**.
4. A Vercel detecta o Vite automaticamente. Confira:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

## 3. Variáveis de ambiente

Ainda na tela de importação, abra **Environment Variables** e adicione:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | sua chave anon/publishable |

Deixe marcados os ambientes **Production**, **Preview** e **Development**.

Clique em **Deploy**. Em cerca de 1 minuto o site estará em `https://seu-projeto.vercel.app`.

> Variáveis `VITE_` são embutidas no momento do build. Se alterá-las depois, faça um novo deploy (**Deployments** → ⋯ → **Redeploy**).

## 4. Ajustar o Supabase

Siga o passo 7 do [tutorial do Supabase](SUPABASE.md#7-configurar-urls-de-autenticação-após-o-deploy) para cadastrar a URL da Vercel em **Authentication → URL Configuration**.

## 5. Testar em produção

- `https://seu-projeto.vercel.app/` → página de agendamento
- `https://seu-projeto.vercel.app/admin` → painel (recarregue a página para confirmar que a rota funciona — o `vercel.json` já redireciona todas as rotas para o app)

## 6. Domínio próprio (opcional)

1. Na Vercel: **Settings** → **Domains** → **Add** e informe o domínio (ex.: `agenda.seusalao.com.br`).
2. Configure o DNS no seu registrador conforme as instruções exibidas.
3. Atualize **Site URL** e **Redirect URLs** no Supabase com o novo domínio.

## Atualizações

Cada `git push` na branch `main` gera um novo deploy automaticamente. Pull requests geram URLs de preview.

Se alterar o banco (`supabase/schema.sql`), execute o arquivo novamente no SQL Editor do Supabase — ele é idempotente.

## Problemas comuns

| Sintoma | Solução |
|---|---|
| 404 ao recarregar `/admin` | Verifique se o `vercel.json` está na raiz do repositório |
| Página mostra "não configurado" | Variáveis ausentes no deploy; adicione e faça **Redeploy** |
| Build falha em `tsc` | Rode `npm run build` localmente e corrija os erros mostrados |
