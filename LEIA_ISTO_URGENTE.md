-- Security hardening for FRAME/Cena Studio Supabase tables.
-- The server may still use the service role key, which bypasses RLS.
-- Browser/client access is limited to public catalog data and each user's own rows.

alter table public.users enable row level security;
alter table public.generations enable row level security;
alter table public.contacts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage enable row level security;
alter table public.reset_tokens enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_states enable row level security;
alter table public.opportunities enable row level security;
alter table public.interactions enable row level security;
alter table public.collaborators enable row level security;
alter table public.project_members enable row level security;
alter table public.files enable row level security;
alter table public.video_reviews enable row level security;
alter table public.video_comments enable row level security;
alter table public.notifications enable row level security;
alter table public.financial_entries enable row level security;
alter table public.studio_settings enable row level security;

alter table public.tools enable row level security;
alter table public.plans enable row level security;

drop policy if exists "Public can read active tools" on public.tools;
create policy "Public can read active tools"
on public.tools for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read plans" on public.plans;
create policy "Public can read plans"
on public.plans for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can submit contact forms" on public.contacts;
create policy "Anyone can submit contact forms"
on public.contacts for insert
to anon, authenticated
with check (true);

drop policy if exists "Users can read own profile row" on public.users;
create policy "Users can read own profile row"
on public.users for select
to authenticated
using (supabase_id = auth.uid());

drop policy if exists "Users can update own profile row" on public.users;
create policy "Users can update own profile row"
on public.users for update
to authenticated
using (supabase_id = auth.uid())
with check (supabase_id = auth.uid());

drop policy if exists "Users can read own subscriptions" on public.subscriptions;
create policy "Users can read own subscriptions"
on public.subscriptions for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = subscriptions.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can read own usage" on public.usage;
create policy "Users can read own usage"
on public.usage for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = usage.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own clients" on public.clients;
create policy "Users can manage own clients"
on public.clients for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = clients.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = clients.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own projects" on public.projects;
create policy "Users can manage own projects"
on public.projects for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = projects.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = projects.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own project states" on public.project_states;
create policy "Users can manage own project states"
on public.project_states for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.users u on u.id = p.user_id
    where p.id = project_states.project_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.users u on u.id = p.user_id
    where p.id = project_states.project_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own generations" on public.generations;
create policy "Users can manage own generations"
on public.generations for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = generations.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = generations.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own opportunities" on public.opportunities;
create policy "Users can manage own opportunities"
on public.opportunities for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = opportunities.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = opportunities.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own interactions" on public.interactions;
create policy "Users can manage own interactions"
on public.interactions for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = interactions.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = interactions.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own collaborators" on public.collaborators;
create policy "Users can manage own collaborators"
on public.collaborators for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = collaborators.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = collaborators.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own project members" on public.project_members;
create policy "Users can manage own project members"
on public.project_members for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.users u on u.id = p.user_id
    where p.id = project_members.project_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.users u on u.id = p.user_id
    where p.id = project_members.project_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own files" on public.files;
create policy "Users can manage own files"
on public.files for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = files.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = files.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own reviews" on public.video_reviews;
create policy "Users can manage own reviews"
on public.video_reviews for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = video_reviews.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = video_reviews.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage comments on own reviews" on public.video_comments;
create policy "Users can manage comments on own reviews"
on public.video_comments for all
to authenticated
using (
  exists (
    select 1
    from public.video_reviews vr
    join public.users u on u.id = vr.user_id
    where vr.id = video_comments.review_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.video_reviews vr
    join public.users u on u.id = vr.user_id
    where vr.id = video_comments.review_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own notifications" on public.notifications;
create policy "Users can manage own notifications"
on public.notifications for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = notifications.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = notifications.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own financial entries" on public.financial_entries;
create policy "Users can manage own financial entries"
on public.financial_entries for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = financial_entries.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = financial_entries.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own studio settings" on public.studio_settings;
create policy "Users can manage own studio settings"
on public.studio_settings for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = studio_settings.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = studio_settings.user_id
      and u.supabase_id = auth.uid()
  )
);

-- No client-side policy for reset_tokens. They are server-only.
# 🚨 URGENTE - APRESENTAÇÃO DIA 06

## Situação Atual

Site está **QUEBRADO** em produção. Ninguém consegue:
- ❌ Criar conta
- ❌ Fazer login
- ❌ Entrar com GitHub

**Erro**: `SyntaxError: Identifier 'getWidgetData' has already been declared`

## ⏰ PRAZO

**Apresentação: 06/07/2026 (AMANHÃ)**

## 🎯 PLANO DE AÇÃO

### PLANO A: Fix Forçado (EXECUTE PRIMEIRO)

```bash
cd "/Users/danteelytra/Projetos - NAO APAGAR/frameai-director-correto"
chmod +x RESOLVER_TUDO_AGORA.sh
./RESOLVER_TUDO_AGORA.sh
```

**O que faz:**
1. Commit todas as mudanças
2. Push para GitHub
3. Force deploy no Vercel
4. Testa automaticamente se funcionou

**Tempo:** 5 minutos

**Após executar:** Aguarde 3-4 minutos e teste:
- https://cenastudio.vercel.app/register

---

### PLANO B: Remover Commercial Hub (SE PLANO A FALHAR)

```bash
cd "/Users/danteelytra/Projetos - NAO APAGAR/frameai-director-correto"
chmod +x EMERGENCIA_REMOVER_COMMERCIAL_HUB.sh
./EMERGENCIA_REMOVER_COMMERCIAL_HUB.sh
```

**O que faz:**
1. Remove TODO o Commercial Hub (fonte do erro)
2. Volta site ao estado funcional
3. Cria backup para restaurar depois

**Tempo:** 3 minutos

**Vantagem:** Site funciona 100% sem Commercial Hub
**Desvantagem:** Perde feature do Commercial Hub (pode restaurar depois)

---

### PLANO C: Rollback Completo (ÚLTIMA OPÇÃO)

```bash
cd "/Users/danteelytra/Projetos - NAO APAGAR/frameai-director-correto"
chmod +x PLANO_B_ROLLBACK.sh
./PLANO_B_ROLLBACK.sh
```

**O que faz:**
1. Volta para versão ANTES do Commercial Hub
2. Site 100% funcional, todas features antigas

**Tempo:** 2 minutos

---

## 🧪 Como Testar

Depois de cada plano:

1. Abra: https://cenastudio.vercel.app
2. Clique: "Criar Conta"
3. Preencha formulário
4. Clique: "Criar Conta Gratuita"

**SE FUNCIONAR** ✅
- Aparece mensagem de sucesso
- Você é redirecionado para dashboard
- **PRONTO PARA APRESENTAÇÃO!** 🎉

**SE NÃO FUNCIONAR** ❌
- Aparece "A server error has occurred"
- **Execute próximo plano**

---

## 📊 Informações do Sistema

**GitHub:** elytraprod-hue/cenastudio
**Vercel:** prj_1wZ0uXNrJCPmjoueJsXqkY9OFPuG
**Supabase:** vylxwhuuqluloxkhlsmd

**Dashboards:**
- Vercel: https://vercel.com/elytraprod-hues-projects/cenastudio/deployments
- Supabase: https://supabase.com/dashboard/project/vylxwhuuqluloxkhlsmd
- GitHub: https://github.com/elytraprod-hue/cenastudio

---

## 👥 Usuários de Teste

Para demonstração, pode usar:

- **Admin**: admin@cenastudio.com.br
- **Demo**: demo@cenastudio.com.br
- **Você**: elytraprod@gmail.com

---

## ⚡ EXECUÇÃO RÁPIDA

```bash
# 1. Execute fix automático
cd "/Users/danteelytra/Projetos - NAO APAGAR/frameai-director-correto"
chmod +x RESOLVER_TUDO_AGORA.sh && ./RESOLVER_TUDO_AGORA.sh

# 2. Aguarde 4 minutos

# 3. Teste: https://cenastudio.vercel.app/register

# 4. Se não funcionar:
chmod +x EMERGENCIA_REMOVER_COMMERCIAL_HUB.sh && ./EMERGENCIA_REMOVER_COMMERCIAL_HUB.sh
```

---

## 🎯 PRIORIDADE

1. ✅ **Site funcionando** > Ter todas as features
2. ✅ **Login/Register OK** > Commercial Hub
3. ✅ **Apresentação sucesso** > Código perfeito

**Melhor ter site 90% funcionando do que 100% quebrado!**

---

**AGORA:** Execute `./RESOLVER_TUDO_AGORA.sh` e me avise o resultado!
