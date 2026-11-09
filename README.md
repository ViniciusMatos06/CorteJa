# Cabeleireiro a Domicílio — Sistema de Agendamento

Sistema web para um cabeleireiro que atende exclusivamente em domicílio. Clientes solicitam horários sem criar conta; o cabeleireiro aprova, recusa ou cancela pelo painel `/admin` e configura sua agenda.

**Stack:** React 19 · Vite · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Auth) · Vercel

---

> 🤖 **Usando IA para manter o projeto?** O arquivo [`AGENTS.md`](AGENTS.md) (também lido via `CLAUDE.md`) descreve arquitetura, regras de segurança, convenções e o passo a passo das mudanças comuns.

## Arquitetura

```
 Navegador (React SPA na Vercel)
   │
   │  chave pública "anon" + RLS
   ▼
 Supabase
   ├─ Funções SQL públicas (SECURITY DEFINER)
   │    get_available_slots(date)      → horários livres (sem dados pessoais)
   │    get_available_dates(from, to)  → dias com pelo menos um horário livre
   │    request_appointment(...)       → único caminho público de escrita
   ├─ Tabelas protegidas por RLS (somente admin)
   │    appointments · breaks · blocked_slots · admin_users
   ├─ Tabelas de leitura pública
   │    business_settings · services (apenas ativos)
   └─ Supabase Auth (login do cabeleireiro)
```

Não existe servidor próprio: a "camada de backend" são as funções e restrições do PostgreSQL. Isso mantém o projeto simples de manter e faz com que **toda regra de negócio crítica seja validada no banco**, não apenas na interface.

### Como a disponibilidade e os conflitos são garantidos

| Regra | Onde é garantida |
|---|---|
| Só dias/horários de expediente | `get_available_slots` gera a grade a partir de `business_settings` |
| Intervalos (almoço) e bloqueios manuais | `get_available_slots` exclui sobreposições com `breaks` e `blocked_slots` |
| Datas/horários passados e antecedência mínima | `get_available_slots` compara com `now()` no fuso do negócio |
| Pendentes e confirmados ocupam o horário | `get_available_slots` + restrição de exclusão |
| Recusado/cancelado libera o horário | A restrição só vale para `status in ('pending','confirmed')` |
| Dois clientes no mesmo horário ao mesmo tempo | `pg_advisory_xact_lock` por data **+** `EXCLUDE USING gist` (sobreposição de intervalos) |
| Cliente não altera status nem lê dados | Sem policy de INSERT/SELECT para `anon`; inserção apenas via função, sempre como `pending` |
| Transições válidas de status | Trigger: `pendente → confirmado/recusado`, `confirmado → cancelado` |
| Admin altera só o status | `GRANT UPDATE (status)` — nenhuma outra coluna é editável pela API |

O schema foi testado num PostgreSQL 16: 20 reservas simultâneas para o mesmo horário resultam em exatamente 1 sucesso e 19 recusas com mensagem amigável.

### Estrutura de pastas

```
├── supabase/
│   ├── schema.sql            # tabelas, RLS, funções, triggers (idempotente)
│   ├── create_admin.sql      # libera o acesso do cabeleireiro ao painel
│   └── seed_services.sql     # (opcional) serviços iniciais
├── docs/
│   ├── SUPABASE.md           # tutorial de configuração do Supabase
│   └── DEPLOY_VERCEL.md      # tutorial de deploy
├── src/
│   ├── components/
│   │   ├── ui/               # Button, Card, Field, Modal, Alert, MonthCalendar, StatusBadge…
│   │   ├── booking/          # ServicePicker, TimeSlotPicker, BookingSummary
│   │   └── admin/            # AdminLayout, ProtectedRoute, AppointmentCard
│   ├── context/              # AuthContext (sessão + is_admin), ToastContext
│   ├── hooks/                # useAppointmentActions (aprovar/recusar/cancelar)
│   ├── lib/                  # cliente Supabase, formatação, validação, erros
│   ├── services/             # bookingService (público), adminService (painel)
│   ├── pages/
│   │   ├── BookingPage.tsx   # página pública "/"
│   │   └── admin/            # Login, Dashboard, Agendamentos, Agenda, Serviços
│   ├── types/
│   ├── App.tsx               # rotas
│   └── main.tsx
├── .env.example
├── vercel.json               # SPA rewrites + headers de segurança
└── package.json
```

**Camadas:** páginas e componentes cuidam da interface; `services/` concentra todo acesso ao Supabase; `lib/` contém regras puras (validação, formatação, tradução de erros). As páginas nunca chamam o Supabase diretamente.

---

## Funcionalidades

**Página pública (`/`)**
- Escolha de serviço, data (calendário só habilita dias com vaga), horário livre e dados do cliente.
- Máscara de WhatsApp, validação de campos, resumo para confirmação e tela de sucesso.
- Se o horário for ocupado no meio do processo, o cliente recebe aviso e a lista é atualizada.

**Painel (`/admin`)**
- **Painel:** atendimentos do dia, pendentes, confirmados, próximo atendimento e ações rápidas.
- **Agendamentos:** lista (próximos/anteriores) ou calendário mensal; filtros por status; aprovar, recusar, cancelar; botão de WhatsApp com mensagem pronta; endereço abre no Google Maps.
- **Agenda:** dias de trabalho, início/fim do expediente, duração do atendimento, antecedência mínima, janela de agendamento, intervalos recorrentes (almoço) e bloqueios de dia inteiro ou de faixa de horário.
- **Serviços:** cadastrar, editar, ocultar e excluir.

---

## Como rodar localmente

Pré-requisitos: Node.js 20+ e um projeto no Supabase configurado ([docs/SUPABASE.md](docs/SUPABASE.md)).

```bash
npm install
cp .env.example .env.local     # preencha URL e chave anon do Supabase
npm run dev                    # http://localhost:5173
```

- Página de agendamento: `http://localhost:5173/`
- Painel: `http://localhost:5173/admin`

Outros comandos:

```bash
npm run build       # checagem de tipos + build de produção em dist/
npm run preview     # serve o build localmente
npm run build:demo  # versão de demonstração (banco simulado no navegador) em dist-demo/
```

> O modo demonstração (`src/demo/`) só entra no build com `VITE_DEMO_MODE=true` (arquivo `.env.demo`). O build normal não inclui esse código.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Chave **pública** (anon / publishable) |

> ⚠️ Tudo que começa com `VITE_` vai para o navegador. **Nunca** use a chave `service_role`/secret neste projeto — ela não é necessária.

## Deploy

Veja [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md).

## Manutenção — onde mexer

| Quero… | Arquivo |
|---|---|
| Mudar cores/fontes | `src/index.css` (`@theme`) e `index.html` |
| Mudar textos da página pública | `src/pages/BookingPage.tsx` |
| Mudar a mensagem do WhatsApp | `src/components/admin/AppointmentCard.tsx` |
| Mudar regras de disponibilidade | `supabase/schema.sql` → `get_available_slots` (reexecute o arquivo) |
| Mudar o limite anti-spam (3 pendentes por número) | `supabase/schema.sql` → `request_appointment` |

## Limitações conhecidas (decisões de simplicidade)

- Todos os serviços usam a mesma duração (a "duração padrão" da agenda).
- A grade de horários é fixa a partir do início do expediente (ex.: 09:00, 10:00…); um horário que cruza o almoço fica indisponível.
- O cliente não recebe notificação automática; o cabeleireiro confirma pelo botão de WhatsApp.
- Bloquear um dia não cancela agendamentos já existentes nele — isso é feito manualmente no painel.
