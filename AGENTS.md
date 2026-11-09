# AGENTS.md — Guia para IA (manutenção e novas funcionalidades)

> Leia este arquivo inteiro antes de alterar o projeto. Ele descreve o que o sistema faz, onde cada coisa fica, as regras que não podem ser quebradas e o passo a passo das mudanças mais comuns.
> Para instalação e deploy voltados a humanos, veja `README.md`, `docs/SUPABASE.md` e `docs/DEPLOY_VERCEL.md`.

---

## 1. O que é o sistema

Agendamento online para **um cabeleireiro que atende somente a domicílio** (cortes masculino, feminino e infantil).

- **Cliente** (página pública `/`): escolhe serviço, data, horário e informa nome, WhatsApp e endereço. **Não tem conta nem login.** A solicitação nasce como *pendente* e já reserva o horário.
- **Cabeleireiro** (painel `/admin`, com login): aprova, recusa ou cancela agendamentos, configura expediente, intervalos, bloqueios e serviços, e conversa com o cliente pelo WhatsApp.

Público: brasileiro, majoritariamente no celular, chegando por link de WhatsApp. **Toda a interface é em português do Brasil.**

## 2. Stack e versões

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 7 (`strict`), Tailwind CSS 4 (`@tailwindcss/vite`), react-router-dom 7, lucide-react (ícones) |
| Backend | Supabase: PostgreSQL + Auth. **Não existe servidor próprio.** |
| Hospedagem | Vercel (SPA; `vercel.json` reescreve todas as rotas para `index.html`) |

Comandos:

```bash
npm run dev         # desenvolvimento (http://localhost:5173)
npm run build       # tsc -b + vite build  → USE PARA VALIDAR QUALQUER MUDANÇA
npm run build:demo  # versão de demonstração com banco simulado → dist-demo/
```

Não há ESLint nem testes automatizados. **O critério mínimo de "pronto" é `npm run build` sem erros.** Mudanças em SQL devem ser testadas num PostgreSQL (ver seção 9).

Alias de import: `@/` aponta para `src/` (ex.: `import { cn } from '@/components/ui/cn'`).

## 3. Arquitetura em uma imagem

```
Navegador (React SPA)
  │  supabase-js com a chave PÚBLICA (anon)
  ▼
Supabase
  ├─ Funções públicas (SECURITY DEFINER) ── o "backend" do cliente
  │    get_available_slots(date)            → horários livres de um dia
  │    get_available_dates(from, to)        → dias com ao menos 1 horário livre
  │    request_appointment(...)             → ÚNICA forma pública de criar agendamento
  ├─ Tabelas com leitura pública: business_settings, services (só ativos)
  ├─ Tabelas só para admin (RLS): appointments, breaks, blocked_slots, admin_users
  └─ Auth: login do cabeleireiro; admin = usuário presente em admin_users
```

**Princípio central: o banco é a fonte da verdade.** Toda regra de negócio crítica (disponibilidade, conflito, validação, status) é garantida no PostgreSQL. O frontend só repete validações para dar feedback rápido.

## 4. Mapa de pastas

```
supabase/
  schema.sql          Tabelas, RLS, grants, triggers e funções. IDEMPOTENTE: pode rodar de novo.
  create_admin.sql    Insere o usuário do cabeleireiro em admin_users.
  seed_services.sql   (opcional) Serviços iniciais: masculino R$70, feminino R$80, infantil R$70.
src/
  main.tsx            Inicialização; no modo demo instala o banco simulado antes de renderizar.
  App.tsx             Rotas. Páginas do admin são lazy (cliente não baixa código do painel).
  index.css           Tailwind + TOKENS DE DESIGN (@theme). Cores e fontes mudam só aqui.
  types/index.ts      Tipos que espelham as tabelas do banco.
  lib/
    supabase.ts       Cliente Supabase, isDemoMode, isSupabaseConfigured.
    errors.ts         toAppError(): traduz erros do Supabase em mensagens pt-BR.
    format.ts         Datas (sem fuso), moeda, telefone, link do WhatsApp.
    validation.ts     Validação do formulário público.
  services/
    bookingService.ts Chamadas da página pública (apenas RPCs e leituras públicas).
    adminService.ts   Chamadas do painel (auth, agendamentos, agenda, serviços).
  context/
    AuthContext.tsx   Sessão + flag isAdmin (via RPC is_admin).
    ToastContext.tsx  Notificações (useToast().success / .error).
  hooks/
    useAppointmentActions.tsx  Modal de confirmação + troca de status (aprovar/recusar/cancelar).
  components/
    ui/               Peças genéricas: Button, Card/SectionTitle, Input/Textarea/Select, Modal,
                      Alert/EmptyState, Spinner/PageLoader, MonthCalendar, StatusBadge, cn().
    booking/          ServicePicker (com pictogramas), TimeSlotPicker, BookingTicket
                      (+ MobileTicketBar), BookingSummary.
    admin/            AdminLayout (+ PageHeader), ProtectedRoute, AppointmentCard.
  pages/
    BookingPage.tsx   Página pública "/".
    admin/            LoginPage, DashboardPage, AppointmentsPage, SchedulePage, ServicesPage.
  demo/
    mockBackend.ts    Banco simulado em memória que intercepta o fetch do supabase-js.
docs/                 Tutoriais para humanos (Supabase e Vercel).
```

### Rotas

| Rota | Página | Acesso |
|---|---|---|
| `/` | BookingPage | público |
| `/admin/login` | LoginPage | público |
| `/admin` | DashboardPage | admin |
| `/admin/agendamentos` | AppointmentsPage (lista ou calendário) | admin |
| `/admin/agenda` | SchedulePage (expediente, intervalos, bloqueios) | admin |
| `/admin/servicos` | ServicesPage | admin |

## 5. Banco de dados

### Tabelas

| Tabela | Conteúdo | Quem acessa |
|---|---|---|
| `business_settings` | Linha única (`id = 1`): nome do negócio, fuso, `work_days` (0=dom…6=sáb), `day_start`, `day_end`, `slot_minutes`, `min_notice_minutes`, `booking_window_days` | leitura pública; update admin |
| `services` | nome, descrição, preço, ativo, ordem | público lê ativos; admin tudo |
| `breaks` | intervalos recorrentes; `weekday` nulo = todos os dias | admin |
| `blocked_slots` | bloqueio por data; `start_time`/`end_time` nulos = dia inteiro | admin |
| `appointments` | dados do cliente, serviço (nome e preço copiados no momento), data, início, fim, status | admin (só lê e muda `status`) |
| `admin_users` | `user_id` de quem pode usar o painel | o próprio usuário lê sua linha |

### Status do agendamento

```
pending ──► confirmed ──► cancelled
   └──────► declined
```

- Transições garantidas pelo trigger `validate_status_transition`. Qualquer outra gera erro.
- `pending` e `confirmed` **ocupam** o horário; `declined` e `cancelled` **liberam**.
- Rótulos em pt-BR ficam em `STATUS_LABEL` (`components/ui/StatusBadge.tsx`).

### Garantias contra conflito (não remover)

1. `request_appointment` usa `pg_advisory_xact_lock` por data e confere o horário em `get_available_slots` antes de inserir.
2. Restrição `appointments_no_overlap` (`EXCLUDE USING gist` sobre `tsrange`), válida só para `status in ('pending','confirmed')`: impede sobreposição mesmo sob concorrência. Já testado: 20 reservas simultâneas → 1 sucesso.

### Como a grade de horários é gerada (`get_available_slots`)

Os horários saem de `day_start` em passos de `slot_minutes` até caber antes de `day_end`. Um horário é removido quando:
- o dia não está em `work_days`, é passado ou passa de `booking_window_days`;
- o dia tem bloqueio de dia inteiro;
- o início é antes de *agora + `min_notice_minutes`* (fuso `business_settings.timezone`);
- há sobreposição com um intervalo, um bloqueio parcial ou um agendamento `pending`/`confirmed`.

A duração é **a mesma para todos os serviços** (`slot_minutes`).

### Convenções de dados

- **Datas** trafegam como string `YYYY-MM-DD` e **horas** como `HH:MM:SS`. Use `hhmm()` para exibir.
- **Nunca** use `new Date('YYYY-MM-DD')` (é interpretado em UTC e muda o dia). Use `parseISODate`, `toISODate`, `addDays` e `todayIn` de `lib/format.ts`.
- Fuso do negócio: `America/Sao_Paulo`.
- WhatsApp é salvo só com dígitos e com DDI: `55` + DDD + número (12–13 dígitos). Exiba com `displayPhone()` e gere links com `whatsappLink()`.
- Preço em `numeric(10,2)`; exiba com `formatCurrency()`.

## 6. Regras de segurança (inegociáveis)

1. **Nunca** usar a chave `service_role`/secret no frontend. Só existe `VITE_SUPABASE_ANON_KEY` (pública).
2. O visitante anônimo **não** lê nem escreve em `appointments`, `breaks`, `blocked_slots` ou `admin_users`. Não crie policies que abram isso.
3. Toda escrita pública nova deve ser uma **função `SECURITY DEFINER` com `set search_path = public`** que valida tudo no servidor. Depois do `create function`, faça `revoke execute … from public` e `grant execute … to anon, authenticated`.
4. O admin só pode alterar a coluna `status` de `appointments` (`grant update (status)`). Para liberar outra coluna, adicione-a explicitamente no grant e explique o motivo.
5. Ter conta no Supabase Auth **não** dá acesso ao painel; quem decide é `admin_users` + `is_admin()`. Mantenha `using (public.is_admin())` nas policies de admin.
6. Dados pessoais do cliente nunca aparecem em respostas de funções públicas.

## 7. Erros e mensagens

- No SQL, erros pensados para o usuário usam `raise exception '<mensagem em pt-BR>' using errcode = 'P0001'`. O frontend exibe a mensagem como está.
- Conflito de horário usa `hint = 'SLOT_UNAVAILABLE'`; a página pública então limpa o horário e recarrega a disponibilidade.
- Nos serviços TS, sempre: `if (error) throw toAppError(error, '<mensagem padrão em pt-BR>')`.
- Nas páginas: `try/catch` → `toast.error(toAppError(e).message)` ou `<Alert tone="error">`.
- Todo carregamento mostra feedback (`PageLoader`, `Spinner` ou `loading` no `Button`).

## 8. Interface e identidade visual

**Direção:** moderno e colorido, fundo claro, amigável para famílias. Elemento marcante: o *ticket do agendamento* (`BookingTicket`) que se preenche ao vivo.

### Tokens (`src/index.css`, bloco `@theme`)

| Token | Valor | Uso |
|---|---|---|
| `canvas` | #fafaf7 | fundo da página |
| `surface` | #ffffff | cards, campos |
| `tint` | #eef5f2 | hover, áreas neutras |
| `line` / `line-strong` | #e3e8e5 / #cbd5d0 | bordas |
| `fg`, `fg-soft`, `fg-muted`, `fg-faint` | #13201d → #a3afab | texto, do mais forte ao mais fraco |
| `brand-50…900` | verde-esmeralda, principal = `brand-600` #0f766e | ações, seleção, marca |
| `sun-100…700` | amarelo, principal = `sun-400` #f4c542 | apoio: ícones, "hoje", pendente |

- Use **somente classes com esses tokens** (`bg-surface`, `text-fg-muted`, `bg-brand-600`…). Não reintroduza cores soltas. Exceções aceitas: vermelho (`red-*`) para erro/cancelar e o verde do WhatsApp (`#25D366`) no botão de WhatsApp.
- Fontes: **Bricolage Grotesque** (`font-display`, títulos) e **Figtree** (`font-sans`, corpo), carregadas em `index.html`.
- Arredondamento por hierarquia: botões e chips `rounded-full`; seções `rounded-3xl`; campos e tiles `rounded-xl`/`rounded-2xl`; ticket `rounded-[28px]`.
- Status: pendente = `sun`, confirmado = `brand`, recusado = neutro, cancelado = `red`.
- Mobile first: a página pública tem barra fixa no rodapé (`MobileTicketBar`) abaixo de `lg`; o admin tem navegação inferior abaixo de `md`. Deixe espaço inferior (`pb-28`/`pb-36`) para elas.
- Movimento discreto: `animate-fade-in`, `animate-scale-in`, `animate-pop`; `prefers-reduced-motion` já é respeitado.
- Pictogramas de serviço: `ServicePicker` escolhe o desenho pelo **nome** (contém "mascul", "femin" ou "infant"/"criança"); outros nomes recebem uma tesoura.

### Textos

- Português do Brasil, frases curtas, sem caixa alta em rótulos.
- O profissional é sempre **"cabeleireiro"** (nunca "barbeiro").
- Botões dizem a ação: "Solicitar agendamento", "Enviar solicitação", "Aprovar", "Recusar", "Cancelar". Mantenha o mesmo verbo do botão no toast de sucesso.
- Erros explicam o que fazer, sem pedir desculpas.

## 9. Passo a passo das mudanças comuns

### Adicionar uma coluna/campo em uma tabela
1. `supabase/schema.sql`: `alter table public.<tabela> add column if not exists …` (mantenha o script idempotente; não edite o `create table` de forma que quebre bancos existentes).
2. Se o campo vier do cliente: adicione o parâmetro em `request_appointment`, valide no SQL e **recrie os grants** com a nova assinatura (a assinatura antiga deve ser removida com `drop function if exists public.request_appointment(<tipos antigos>)`).
3. `src/types/index.ts` → tipo correspondente.
4. `src/services/*` → leitura/escrita.
5. UI (página/componente).
6. `src/demo/mockBackend.ts` → espelhe o campo e a validação.
7. `npm run build`.

### Mudar uma regra de disponibilidade
- Altere `get_available_slots` em `supabase/schema.sql` **e** `getAvailableSlots` em `src/demo/mockBackend.ts` (espelho da demo). Os dois precisam se comportar igual.
- Teste no PostgreSQL (abaixo) e na demo.

### Duração diferente por serviço (pedido provável)
- Adicionar `duration_minutes` em `services`; `get_available_slots` passa a receber o serviço (`p_service_id`) e usa a duração dele; `request_appointment` calcula `end_time` com essa duração; a página pública só busca datas/horários depois de escolher o serviço (`get_available_dates` também recebe o serviço). Atualizar `ServicesPage`, tipos e mock.

### Nova página no painel
1. Criar `src/pages/admin/NovaPage.tsx` (default export) usando `PageHeader`.
2. Registrar com `lazy()` em `App.tsx`, dentro do `<Route element={<AdminLayout />}>`.
3. Adicionar item em `NAV` (`AdminLayout.tsx`). A navegação inferior do celular tem 4 colunas (`grid-cols-4`); ajuste se passar disso.

### Notificações automáticas (e-mail/WhatsApp)
- Precisam de segredo → **não** podem ficar no frontend. Use Supabase Edge Function ou Database Webhook com a chave guardada no Supabase. Nunca exponha a chave em `VITE_*`.

### Testar SQL localmente
Supabase usa PostgreSQL; para testar sem a nuvem, crie um stub mínimo antes de rodar `schema.sql`:
```sql
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
```
Depois rode `schema.sql` duas vezes (confere idempotência) e simule papéis com `set role anon;` ou `set role authenticated; set request.jwt.sub = '<uuid>';`.

## 10. Modo demonstração

- Ativado por `VITE_DEMO_MODE=true` (arquivo `.env.demo`, usado por `npm run build:demo`). **O build normal não inclui o código de `src/demo/`.**
- `mockBackend.ts` substitui `window.fetch` para a origem `https://demo.supabase.local` e implementa um mini-PostgREST (filtros `eq`, `gte`, `lte`, `in`, `order`, `limit`), as RPCs e o login (qualquer e-mail e senha).
- No demo: `HashRouter` (a página hospedada não tem rotas no servidor), sessão em memória, e links externos **sem** `target="_blank"` (o iframe isolado bloqueia nova aba; veja `externalLinkProps` em `AppointmentCard.tsx`).
- Os agendamentos de exemplo começam com "Exemplo —" e a tela de login avisa que nada é salvo. O acesso ao painel é pelo botão "Entrar como cabeleireiro" no topo da página pública.
- Link público da demo: <https://claude.ai/artifact/MPM71hZy2oGTwMQZutV4RU> (republicado a partir de `dist-demo/`).

## 11. Antes de entregar qualquer mudança (checklist)

- [ ] `npm run build` passa sem erros.
- [ ] Regra de negócio nova está no **banco**, não só na interface.
- [ ] `schema.sql` continua idempotente; grants/revokes ajustados para funções novas.
- [ ] Nenhuma policy ou grant novo dá ao `anon` acesso a dados pessoais.
- [ ] `mockBackend.ts` acompanha a mudança (se afetar dados ou regras).
- [ ] Textos em pt-BR, usando "cabeleireiro".
- [ ] Usa os tokens de design; funciona no celular (≈390px) e no desktop.
- [ ] README/docs atualizados se mudou instalação, variáveis ou deploy.
- [ ] Não foram criados dados fictícios fora do modo demo.

## 12. Limitações conhecidas (decisões de simplicidade)

- Mesma duração para todos os serviços.
- Grade fixa a partir do início do expediente; horário que cruza o almoço some.
- Sem notificação automática ao cliente; confirmação manual via botão de WhatsApp.
- Bloquear um dia não cancela agendamentos existentes nele.
- Anti-spam simples: no máximo 3 solicitações pendentes futuras por número de WhatsApp (em `request_appointment`).
