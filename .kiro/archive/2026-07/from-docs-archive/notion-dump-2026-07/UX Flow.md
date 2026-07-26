# UX Flow

> Storytelling operacional e arquitetura de navegação do Cena Studio.
> Baseado na arquitetura implementada em 30 de Junho de 2026.

---

## 🎯 O Conceito Central

O problema original do sistema não era falta de funcionalidades, mas sim a ausência de hierarquia. As ferramentas e páginas competiam por atenção sem um fluxo claro.

A decisão central arquitetural: **O projeto (job) passa a ser a unidade principal de navegação e continuidade.**

Briefing, propostas, roteiros, arquivos e revisões não são destinos isolados; eles são etapas dentro do mesmo trabalho.

---

## 🧭 Navegação Global

A barra principal foi simplificada para no máximo 5 destinos operacionais:

1. **Hoje** — Pendências, prazos, aprovações e continuidade do último job (substitui o antigo Dashboard).
2. **Projetos** — Lista, filtros, novo projeto e acesso aos jobs.
3. **Comercial** — Centraliza CRM (clientes), oportunidades, interações, propostas e pipeline.
4. **Financeiro** — Orçamentos, receita, margem e indicadores.
5. **Mais** — Equipe, configurações, empresa, perfil e administração.

Elementos persistentes: Busca (Cmd+K), notificações, perfil e seletor de projeto ativo.

Atualização de clareza narrativa (01/07/2026):
- **Hoje** concentra a continuidade em "Agora na sua história", com uma ação primária para completar briefing, definir prazo ou continuar o capítulo atual.
- Métricas e Comercial/Produção/Financeiro existem como leitura secundária, não como concorrentes da próxima ação.
- O seletor de projeto ativo aparece a partir de desktop `xl`, mantendo o job visível enquanto o usuário navega.

---

## 🛤️ A Jornada do Projeto

Ao entrar em um projeto (`/project/:id`), a navegação muda para uma jornada em 6 etapas:

1. **Entrada** — Cliente, briefing, escopo, proposta, orçamento, contrato.
2. **Planejamento** — Roteiro, moodboard, cronograma, decupagem, callsheet, checklist.
3. **Produção** — Equipe, materiais, arquivos e acompanhamento.
4. **Revisão** — Versões de vídeo, comentários e aprovação do cliente.
5. **Entrega** — Pacote final, documentos, aceite.
6. **Fechamento** — Resultado financeiro, arquivamento.

Cada etapa apresenta claramente:
- O estado atual (não iniciada, em andamento, bloqueada, concluída)
- A principal pendência
- A ação recomendada
- Os artefatos produzidos

---

## 🛠️ O Papel das Ferramentas

As 12 ferramentas IA deixaram de ser apenas uma vitrine e foram categorizadas:

Quando existe projeto ativo, a biblioteca Tools opera em **modo projeto ativo**: o card inteiro da ferramenta abre `/project/:projectId/studio/:tool`, salvando contexto, histórico e versões no job. Sem projeto ativo, Tools continua como biblioteca solta para criação avulsa.

### 1. Sessões Operacionais Dedicadas
Merecem tela cheia, pois envolvem ciclo completo (`rascunho → revisão → aprovado → exportado`):
- Briefing, Orçamento, Proposta, Contrato, Revisão de Vídeo, Relatório de Entrega.

### 2. Ferramentas de Produção no Studio
Permanecem no ambiente Studio, ligadas à etapa correta do projeto:
- Roteiro, Decupagem, Callsheet, Cronograma, Moodboard, Checklist.

### 3. Assistente Transversal
O "Assistente Livre" atua via Cmd+K ou chat flutuante, auxiliando sem interromper o fluxo primário.

---

## 🔄 Continuidade de Dados

- Todo artefato carrega o contexto: `projectId`, `clientId`, `status`, `version`.
- **Preenchimento Inteligente:** O sistema usa dados do cliente e do projeto para sugerir preenchimentos no Studio, mas **nunca sobrescreve** edição manual sem confirmação.
- O fim de uma etapa sugere a próxima (ex: Briefing aprovado sugere criar Proposta ou Roteiro).

---

## 📏 Princípios Visuais da Interface

1. **Ação Primária Única:** Uma ação principal visível por tela.
2. **Separação de Navegação:** Navegação global para áreas; navegação local para a jornada do job.
3. **Status Multissensorial:** Progresso usa texto + ícone + cor (nunca apenas cor, por acessibilidade).
4. **Revelação Progressiva:** Informação secundária vai para painéis laterais (drawers/sheets).
5. **Estética Cinematográfica:** Preservar a identidade dark/cinza, laranja de destaque, grids estruturados e ausência de cards puramente decorativos.

---

#ux #design #navegacao #fluxo #arquitetura-ux
