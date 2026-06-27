# Cena Studio - Auditoria de Alinhamento

Data: 2026-06-27

## Diagnóstico

O produto está bem alinhado com a visão do Master Plan: centralizar a operação audiovisual com IA, projetos, clientes, arquivos, aprovações, equipe e inteligência operacional. A base atual já entrega um núcleo real de plataforma: 12 ferramentas IA, CRM, pipeline, projetos, estados por ferramenta, arquivos, video reviews, colaboradores, analytics, autenticação e planos.

O principal desalinhamento estava na camada de comunicação e amarração de rotas: parte do README e da landing prometia mais ou diferente do que estava conectado no app.

## Desalinhamentos Encontrados

- O README documentava `/project/:id`, `/project/:id/files`, `/project/:id/video-reviews` e `/project/:id/collaborators`, mas o roteador só ligava o Studio contextual.
- `ProjectHub` existia, mas não estava registrado como rota.
- `ProjectHub` buscava reviews por query string, enquanto a API real usa `/api/video-reviews/projects/:projectId`.
- A landing exibia claims não comprovados no produto atual: "5K+ Projetos Realizados", "50+ Ferramentas e Módulos" e "12 Países".
- Os planos públicos da landing não batiam com os planos seedados no banco (`free`, `pro`, `studio`).
- O README dizia que Stripe havia sido substituído, mas o backend ainda mantém rotas e serviço Stripe.
- A documentação de alguns endpoints estava divergente do backend real, especialmente arquivos e export.
- A apresentação comercial tinha ferramentas e pricing antigos, incluindo Storyboard/API/Business/Enterprise como se já fossem oferta atual.

## Correções Aplicadas

- Conectada a rota `/project/:id` ao `ProjectHub`.
- Conectadas as rotas contextuais `/project/:projectId/files`, `/project/:projectId/video-reviews` e `/project/:projectId/collaborators`.
- `Files` agora exibe `ProjectNav` quando acessado por rota de projeto e mantém navegação contextual.
- `Collaborators` agora exibe `ProjectNav` quando acessado por rota de projeto.
- `VideoReviews` agora carrega reviews do projeto via endpoint correto quando há `projectId`.
- `ProjectHub` passou a buscar reviews pelo endpoint real da API.
- Landing ajustada para claims comprováveis: 12 ferramentas IA, 6 módulos operacionais e foco inicial BR.
- Pricing da landing alinhado aos planos do banco: Free R$0, Pro R$49 e Studio R$99.
- Texto da seção de pricing ajustado para não prometer todas as ferramentas no plano Free.
- README atualizado para refletir rotas, porta de API, endpoints, IA por NVIDIA/Anthropic e Stripe como legado/API.
- Apresentação comercial atualizada para remover ofertas e módulos não ativos como promessa atual.

## Roadmap Técnico

### Fase 1 - Rotas e Documentação

Concluída nesta auditoria. Manter README, landing e rotas sincronizados a cada alteração de produto.

### Fase 2 - Landing, Pricing e Checkout

Definir se o fluxo oficial será 100% WhatsApp/PIX ou checkout automatizado. Se WhatsApp for o padrão, remover chamadas de checkout Stripe da UI interna ou rotular claramente como legado/admin.

### Fase 3 - Project Hub e Fluxo por Projeto

Fortalecer `/project/:id` como centro operacional: status do projeto, próximos passos, equipe vinculada ao projeto, aprovações recentes, arquivos recentes e progresso do pipeline IA.

### Fase 4 - Demo, Venda e Captação

Preparar dados demo, roteiro de venda, métricas reais de uso, claims verificáveis e documentação de produto por módulo. Não publicar números de tração antes de existirem evidências.

## Verificação

- `npm run check` executado com sucesso.
