# Arquitetura de Fluxo e UX - Cena Studio

**Status:** Implementada em cinco fases
**Data:** 30 de junho de 2026
**Objetivo:** simplificar a orientacao do usuario sem remover funcionalidades ou descaracterizar a identidade visual.

## 1. Diagnostico

O Cena Studio ja possui os modulos necessarios para operar um job audiovisual, mas hoje eles aparecem como destinos paralelos. O usuario encontra painel, CRM, pipeline, ferramentas, documentos, arquivos, aprovacao, equipe e financeiro antes de entender qual trabalho deve continuar.

Os principais conflitos sao:

1. A navegacao global mistura areas de negocio, etapas do trabalho e ferramentas.
2. O ProjectHub possui uma sequencia operacional, mas ela nao governa o restante da experiencia.
3. As 12 ferramentas de IA aparecem como uma vitrine uniforme, embora tenham pesos e momentos muito diferentes.
4. Rotas globais e rotas por projeto oferecem funcoes semelhantes, criando duvida sobre onde o dado sera salvo.
5. O sistema mostra muitos destinos possiveis e pouca orientacao sobre a proxima acao.

O problema nao e excesso de capacidade. E falta de hierarquia entre capacidade, contexto e proximo passo.

## 2. Decisao central

O **projeto/job passa a ser a unidade principal de navegacao e continuidade**. Cliente, briefing, proposta, documentos, IA, arquivos, equipe, aprovacao, entrega e resultado financeiro devem parecer partes do mesmo trabalho.

Simplificar significa:

- reduzir escolhas simultaneas;
- mostrar uma acao primaria por contexto;
- revelar funcoes secundarias quando se tornam relevantes;
- manter todas as funcoes acessiveis;
- preservar tipografia, contraste, preto, laranja, grid, linguagem cinematografica e comportamento responsivo da marca.

Nao significa esconder erros, apagar ferramentas ou transformar o produto em um assistente linear obrigatorio. O usuario experiente podera saltar etapas e usar busca/comandos.

## 3. Arquitetura de informacao alvo

### Navegacao global

A barra principal deve conter no maximo cinco destinos operacionais:

1. **Hoje** - pendencias, prazos, aprovacoes e continuidade do ultimo job.
2. **Projetos** - lista, filtros, novo projeto e acesso aos jobs.
3. **Comercial** - clientes, oportunidades, interacoes, propostas e pipeline.
4. **Financeiro** - orcamentos consolidados, receita, margem e indicadores.
5. **Mais** - biblioteca global, equipe, empresa, perfil e administracao.

Elementos persistentes: busca/comandos, notificacoes, conta, plano e seletor de projeto ativo quando houver contexto.

`Pipeline` deixa de competir com `Comercial`. `Documents`, `Files`, `Video Reviews` e `Collaborators` deixam de ser destinos globais primarios e passam a ser apresentados prioritariamente dentro do projeto. As rotas globais continuam existindo como arquivo/biblioteca e para compatibilidade.

### Inicio orientado

O atual Dashboard evolui para **Hoje**, uma central de decisao com esta ordem:

1. continuar o job ativo;
2. resolver aprovacoes e prazos;
3. abrir projetos recentes;
4. iniciar novo cliente, oportunidade ou projeto;
5. consultar atividade e indicadores resumidos.

A tela nao deve tentar representar o sistema inteiro. Ela deve responder: **o que precisa da minha atencao agora?**

### Workspace do projeto

Ao abrir um projeto, a navegacao muda de departamentos para uma jornada:

1. **Entrada** - cliente, briefing, escopo, proposta, orcamento e contrato.
2. **Planejamento** - roteiro, moodboard, cronograma, decupagem, callsheet e checklist.
3. **Producao** - equipe, materiais, arquivos e acompanhamento do job.
4. **Revisao** - versoes de video, comentarios e aprovacao do cliente.
5. **Entrega** - pacote final, documentos, aceite e historico de entrega.
6. **Fechamento** - resultado financeiro, margem, aprendizados e arquivamento.

Cada etapa deve apresentar:

- estado: nao iniciada, em andamento, bloqueada ou concluida;
- principal pendencia;
- acao recomendada;
- artefatos produzidos;
- acesso a todas as funcoes da etapa;
- avancar e voltar sem perder contexto.

O progresso nao deve depender apenas de o usuario ter aberto uma ferramenta. Ele deve ser derivado de artefatos e estados reais: briefing salvo, proposta enviada, contrato aprovado, review aprovado ou entrega concluida.

## 4. Papel das ferramentas

As ferramentas deixam de ser doze portas equivalentes e passam a ocupar tres categorias.

### Sessoes operacionais dedicadas

Merecem tela completa por reunirem dados, decisao, versoes, aprovacao e exportacao:

- Briefing;
- Orcamento;
- Proposta;
- Contrato;
- Revisao/Aprovacao;
- Entrega.

Essas sessoes seguem o ciclo `rascunho -> revisao -> aprovado -> exportado/arquivado` e mostram cliente, projeto, responsavel, historico e proxima acao.

### Ferramentas de producao no Studio

Continuam no ambiente Studio, ligadas ao projeto e a etapa correta:

- roteiro;
- decupagem;
- callsheet;
- cronograma;
- moodboard;
- checklist.

### Assistente transversal

O Assistente permanece disponivel por busca/comandos e dentro do projeto. Ele auxilia o fluxo, mas nao substitui a navegacao nem cria uma segunda fonte de verdade.

## 5. Continuidade de dados

Todo artefato deve carregar explicitamente:

- `projectId`;
- `clientId` quando aplicavel;
- tipo de artefato;
- etapa do fluxo;
- status;
- versao;
- autor e responsavel;
- datas de criacao, atualizacao, aprovacao e exportacao.

O preenchimento por contexto continua sendo sugestivo e seguro: dados de cliente/projeto preenchem campos vazios, nunca sobrescrevem edicao manual sem confirmacao.

Ao concluir uma sessao, o sistema deve sugerir a continuacao real. Exemplo: briefing aprovado abre roteiro ou proposta; video aprovado abre entrega; entrega aceita abre fechamento.

## 6. Principios visuais

1. Uma acao primaria visivel por tela ou etapa.
2. Navegacao global para areas; navegacao local para o job.
3. Progresso e estado usam texto, icone e cor, nunca apenas cor.
4. Informacao secundaria usa revelacao progressiva, paineis laterais ou menus.
5. Cards somente para itens repetidos ou ferramentas; secoes estruturais permanecem sem card decorativo.
6. Titulos grandes apenas em entradas de contexto; telas operacionais usam densidade e hierarquia compactas.
7. Mobile prioriza proxima acao, etapa atual e seletor de projeto; abas viram menu/stepper horizontal estavel.
8. Animacao comunica mudanca de estado e continuidade, sem atrasar tarefas frequentes.

## 7. Mapeamento de implementacao

| Superficie atual | Evolucao proposta |
|---|---|
| `AppNavBar` | Hoje, Projetos, Comercial, Financeiro e Mais; contexto do projeto separado |
| `Dashboard` | Central Hoje orientada por pendencias e continuidade |
| `ProjectNav` | Stepper Entrada -> Planejamento -> Producao -> Revisao -> Entrega -> Fechamento |
| `ProjectHub` | Visao do job com etapa atual, bloqueios, artefatos e proxima acao |
| `Tools` | Biblioteca filtravel por etapa, com destaque para sessoes dedicadas |
| `StudioShell` | Ferramenta dentro da etapa, com contexto e anterior/proximo |
| `Documents` | Biblioteca de artefatos do projeto com versao, status e aprovacao |
| `Clients/Pipeline` | Area Comercial unica, com conversao de oportunidade ganha em projeto |
| `Files/Reviews/Team` | Funcoes locais do projeto, mantendo visoes globais de consulta |
| `CommandPalette` | Atalho para usuarios experientes, inclusive criacao avulsa |

## 8. Fases de execucao

### Fase 1 - Fundacao de navegacao

- [concluido] ajustar taxonomia da barra global sem remover rotas;
- [concluido] criar entrada `Projetos` e agrupar CRM/pipeline em `Comercial`;
- [concluido] adicionar seletor de projeto e breadcrumb contextual;
- [concluido] atualizar busca/comandos para a nova arquitetura e projetos recentes.

### Fase 2 - Hoje e jornada do projeto

- [concluido] reorganizar Dashboard como central Hoje;
- [concluido] substituir abas tecnicas do ProjectNav pelo stepper do ciclo do job;
- [concluido] tornar etapa atual, progresso e proxima acao visiveis no ProjectHub;
- [concluido] criar paginas de capitulo sem retirar acesso rapido a qualquer ferramenta.

### Fase 3 - Artefatos e sessoes dedicadas

- [concluido] criar modelo comum de artefato, status e versao sobre `project_states`;
- [concluido] organizar Briefing, Orcamento, Proposta, Contrato, Revisao e Entrega como sessoes dedicadas;
- [concluido] conectar geracao IA, documento editavel, revisao, aprovacao e arquivo;
- [concluido] preservar historico e exportacoes existentes.

### Fase 4 - Comercial ate projeto

- [concluido] reunir clientes, oportunidades, interacoes, propostas e pipeline sob a entrada Comercial;
- [concluido] permitir converter oportunidade ganha em projeto com contexto preenchido e protecao contra duplicidade;
- [concluido] ligar fechamento do projeto ao financeiro e a conclusao do job.

### Fase 5 - Refinamento e validacao

- [concluido] ampliar testes automatizados da jornada e conversao comercial;
- [concluido] validar desktop e mobile em Hoje, Projetos, Comercial, capitulos, Studio, Tools e Documents;
- [concluido] revisar teclado, estados vazios, erros, carregamento e overflow;
- [concluido] manter rotas e funcoes anteriores acessiveis durante a nova arquitetura.

## 9. Criterios de aceite

A reorganizacao so pode ser considerada pronta quando:

1. Um novo usuario identifica em ate cinco segundos onde iniciar ou continuar.
2. Todo projeto mostra etapa atual e uma proxima acao explicita.
3. Todas as 12 ferramentas continuam acessiveis em ate dois niveis de navegacao.
4. Nenhuma funcao existente perde rota sem redirecionamento e alternativa equivalente.
5. Dados criados dentro de um projeto permanecem ligados ao projeto apos reload.
6. Desktop e mobile nao apresentam overflow, sobreposicao ou texto truncado de forma destrutiva.
7. Fluxos criticos possuem teste automatizado e validacao real no navegador.
8. Documentacao, traducoes, build e changelog sao atualizados em cada fase.

## 10. Resultado da implementacao

As cinco fases foram aplicadas em 30 de junho de 2026. A proxima evolucao deve aprofundar persistencia compartilhada do historico de documentos e metricas de uso da jornada, sem reabrir a arquitetura de navegacao antes de observar comportamento real dos usuarios.
