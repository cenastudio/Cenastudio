# Storyboard IA conectado ao Shot List — Requirements

## Contexto

O Cena Studio já tem Shot List por projeto com ordenação, tipos de plano,
thumbnail manual e exportação PDF. A próxima evolução não deve virar uma
ferramenta escondida no Studio: storyboard precisa nascer dentro do mesmo fluxo
em que a produtora planeja, aprova e leva os planos para o set.

## Capability

Usuários Pro+ podem gerar, revisar, aprovar e exportar quadros visuais de
referência vinculados a shots específicos, começando por sketch/storyboard em
preto e branco ou lápis. Cada imagem precisa manter vínculo com projeto, shot,
prompt, status, revisão e responsável.

## Requisitos

### R1. Integração com Shot List

- O storyboard é uma visão/ação dentro do Shot List do projeto.
- Cada shot pode ter zero ou mais quadros de storyboard.
- Um quadro aprovado pode alimentar `thumbnail_url` do shot sem apagar o
  histórico das gerações anteriores.
- A UI deve deixar claro o estado por shot: sem quadro, gerando, gerado,
  aprovado ou falhou.

### R2. Geração por IA

- O usuário informa intenção visual em linguagem natural.
- O sistema monta um prompt final usando dados do shot: cena, tipo, descrição,
  câmera, lente, movimento e notas.
- O estilo padrão do MVP é sketch de storyboard: monocromático, desenho de
  lápis, composição clara, sem aparência final publicitária.
- O provider de imagem deve ficar atrás de adapter configurável por ambiente.
- Sem credencial de imagem configurada, a rota deve falhar de forma explícita
  ou operar em modo mock/local de desenvolvimento, nunca fingir sucesso em
  produção.

### R3. Persistência e auditoria

- Cada quadro registra: projeto, shot, usuário criador, prompt do usuário,
  prompt final, provider, modelo, URL/asset, status, erro quando houver,
  revisão, data de criação e data de aprovação.
- Aprovar uma nova revisão não remove as anteriores.
- O isolamento entre produtoras é obrigatório em todas as queries.

### R4. Storage

- O destino preferencial é Supabase Storage, para alinhar com a arquitetura
  atual Vercel + Supabase.
- O código deve reconhecer que `thumbnail_url` atual pode vir de Cloudinary por
  legado; o MVP não precisa migrar thumbnails antigas.
- Assets gerados precisam ter caminho previsível por tenant/projeto/shot e não
  devem expor secrets.

### R5. Plano e limites

- A feature segue o gate de Shot List: Pro+.
- Limites de geração por plano devem existir antes de produção paga:
  Pro com limite mensal, Studio/White Label/Enterprise com limite maior ou
  ilimitado conforme decisão comercial.
- Falha por limite deve retornar erro 402/429 claro e não criar frame fantasma.

### R6. Exportação e set

- Export PDF do Shot List deve poder incluir o quadro aprovado de cada shot.
- A impressão para set deve continuar útil mesmo se alguma imagem falhar.
- Mobile deve permitir ver, aprovar e substituir referência sem layout quebrado.

## Não objetivos do MVP

- Vídeo, animatic ou parallax.
- Edição de imagem avançada.
- Geração de várias proporções por padrão.
- Biblioteca global de assets desvinculada do shot.
- Compartilhamento direto com cliente antes de aprovação pela produtora.

## Questões abertas

- Provider inicial de imagem: OpenAI Images, fal.ai, Replicate ou outro.
- Limites comerciais finais por plano.
- Bucket/nome definitivo no Supabase Storage.
- Se o cliente poderá ver storyboard aprovado no Portal em fase futura.
