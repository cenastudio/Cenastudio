# Checklist de Teste Manual - Cena Studio

Guia completo para testar todos os aspectos visuais e de acessibilidade do sistema.

## 📋 Como usar este checklist

1. Abra o app em produção: https://cenastudio-production.up.railway.app
2. Marque cada item testado com ✅ ou ❌
3. Anote bugs encontrados na seção de Issues no final
4. Execute testes em **ambos os temas** (dark e light)

---

## 🎨 TEMA - Alternar entre Dark e Light

### Setup
- [ ] Ir em Profile → Preferências → Visual
- [ ] Testar alternância entre "Escuro", "Claro" e "Auto"
- [ ] Verificar se a mudança é instantânea (sem reload)

---

## 🏠 DASHBOARD

### Tema Dark
- [ ] Hero header (Bom dia/Boa tarde) legível
- [ ] Job em foco: título, badges, deadline visíveis
- [ ] Progresso do projeto (barra laranja) visível
- [ ] Pendências: cards com ícones e texto legíveis
- [ ] Atalhos: ícones laranjas com bom contraste
- [ ] Atividades recentes: timestamps legíveis
- [ ] Skeleton loaders aparecem ao recarregar (F5)

### Tema Light
- [ ] Todos os textos laranjas pequenos têm bom contraste
- [ ] Badges (01, 02, 03) legíveis
- [ ] Eyebrows (labels pequenos em mono) legíveis
- [ ] Hover states dos botões visíveis
- [ ] Focus ring ao navegar por Tab

### Interações
- [ ] Botão "Novo projeto" abre modal
- [ ] Modal de criação tem foco no primeiro campo
- [ ] ESC fecha o modal
- [ ] Loading state no botão "Criar" (spinner + texto)
- [ ] Toast de sucesso ao criar projeto

---

## 📁 PROJETOS

### Lista
- [ ] **Skeleton loader** aparece ao carregar
- [ ] Grid responsivo (3 cols desktop → 1 col mobile)
- [ ] Cards com hover effect suave
- [ ] Badges de status coloridos e legíveis
- [ ] Empty state quando não há projetos

### Dark vs Light
- [ ] Contraste dos cards em ambos os temas
- [ ] Texto dos badges legível
- [ ] Hover states visíveis

### Navegação
- [ ] Tab percorre todos os cards
- [ ] Enter abre o projeto focado
- [ ] Focus ring visível

---

## 👥 CLIENTES

### Lista
- [ ] **Skeleton loader** aparece ao carregar (5 cards)
- [ ] Cards com informações de contato legíveis
- [ ] Ícones de telefone/email com bom contraste
- [ ] Filtros funcionam (Status, Segmento)
- [ ] Busca filtra em tempo real

### Dark vs Light
- [ ] Texto pequeno (phone, email) legível em ambos
- [ ] Badges de status com bom contraste
- [ ] Empty state visível

### Interações
- [ ] Hover nos cards destaca visualmente
- [ ] Focus ring ao navegar por Tab
- [ ] Botão "Novo Cliente" abre formulário
- [ ] Toast de sucesso ao criar cliente

---

## 📝 PROPOSTAS

### Builder
- [ ] Eyebrow "// CRIAR PROPOSTA" legível (tema light!)
- [ ] Step numbers (01, 02, 03) com bom contraste
- [ ] Label "TOTAL" legível
- [ ] Preview da proposta renderiza corretamente
- [ ] Seleção de serviços funciona

### Dark vs Light
- [ ] **CRÍTICO:** Todos os step numbers legíveis no tema light
- [ ] Borders dos steps visíveis
- [ ] Texto do preview legível

### Interações
- [ ] Adicionar serviço funciona
- [ ] Editar serviço abre modal
- [ ] Exportar PDF funciona
- [ ] Toast de sucesso ao salvar

---

## 🎬 PROJECT HUB

### Visão Geral
- [ ] Badge de tipo de projeto legível (tema light!)
- [ ] "Próximo passo" destacado
- [ ] Stage numbers (workflow) legíveis
- [ ] Badges "FILLED" / "PENDING" com bom contraste
- [ ] Avatares de membros coloridos

### Seções
- [ ] Arquivos recentes: empty state se vazio
- [ ] Reviews: badge de pendências visível
- [ ] Time: botão "Adicionar membro" claro
- [ ] Links "Ver todos" legíveis (tema light!)

### Interações
- [ ] Editar nome do projeto inline
- [ ] Toast ao salvar mudanças
- [ ] Adicionar membro abre modal
- [ ] Loading states nos botões

---

## ⏱️ TIMESHEET

### Lista
- [ ] Timer em andamento destacado
- [ ] Step numbers (01, 02, 03) legíveis (tema light!)
- [ ] Totalizadores de horas visíveis
- [ ] Tabela de entradas formatada

### Interações
- [ ] Iniciar timer funciona
- [ ] Pausar/parar timer funciona
- [ ] Toast de feedback em ações
- [ ] Loading no botão ao salvar

---

## 💰 BUDGET

### Categorias
- [ ] Step numbers legíveis (tema light!)
- [ ] Gráfico de pizza visível
- [ ] Valores monetários formatados
- [ ] Progress bars coloridas

### Interações
- [ ] Adicionar categoria funciona
- [ ] Editar orçamento inline
- [ ] Toast ao salvar
- [ ] Loading states

---

## 👤 PROFILE

### Abas
- [ ] **Toggles não vazam** (bolinha dentro do container!)
- [ ] Switches laranja/preto bem contrastados
- [ ] Seções com ícones laranjas legíveis
- [ ] Badges "Admin" legíveis (tema light!)

### Security
- [ ] Alertas de segurança: toggles funcionam
- [ ] API Keys: lista formatada
- [ ] Activity log: timestamps legíveis
- [ ] 2FA: QR code renderiza

### Privacy
- [ ] Toggles de privacidade funcionam
- [ ] Dashboard LGPD: métricas legíveis
- [ ] Botão "Solicitar cópia" funciona

### Preferences
- [ ] Toggle "Reduzir animações" funciona
- [ ] Seletor de idioma (PT/EN) funciona
- [ ] Seletor de tema funciona
- [ ] Toast ao salvar preferências

---

## 🔧 ADMIN DASHBOARD

### Overview
- [ ] Eyebrow "// ADMIN" legível (tema light!)
- [ ] Section headers legíveis
- [ ] Badges "Admin" em usuários legíveis
- [ ] Audit log: actions destacadas

### Usuários
- [ ] Toggles de ferramentas IA funcionam
- [ ] Mudança de role funciona
- [ ] Loading state ao deletar usuário
- [ ] Modal de detalhes completo

### Dark vs Light
- [ ] Todos os headers de seção legíveis
- [ ] Badges de status coloridos
- [ ] Números/métricas legíveis

---

## ♿ ACESSIBILIDADE - Navegação por Teclado

### Geral
- [ ] **Tab** percorre todos os elementos interativos
- [ ] **Shift+Tab** volta na ordem
- [ ] **Focus ring** sempre visível
- [ ] **Enter** ativa botões focados
- [ ] **Space** ativa checkboxes/toggles
- [ ] **Esc** fecha modais

### Modais
- [ ] Foco vai automaticamente pro modal ao abrir
- [ ] Tab fica "preso" dentro do modal
- [ ] Esc fecha o modal
- [ ] Foco retorna ao elemento que abriu

### Forms
- [ ] Tab percorre campos na ordem lógica
- [ ] Labels associados aos inputs (clique no label foca input)
- [ ] Enter submete formulário
- [ ] Erros de validação anunciados

---

## 🔊 ACESSIBILIDADE - Screen Reader (VoiceOver)

### Ativar VoiceOver no Mac
```
Cmd + F5 (ou Command + Touch ID 3x)
```

### Comandos básicos
- `VO` = Control + Option
- `VO + Setas` = Navegar
- `VO + Space` = Ativar elemento

### Testes
- [ ] Botões têm labels descritivos
- [ ] Ícones sozinhos têm `aria-label`
- [ ] Modais anunciam título ao abrir
- [ ] Loading states anunciados ("Carregando...")
- [ ] Toast messages lidas automaticamente
- [ ] Formulários: labels lidos corretamente
- [ ] Erro de validação anunciado

---

## 📱 RESPONSIVIDADE

### Desktop (>1024px)
- [ ] Layout em 3 colunas funciona
- [ ] Sidebar visível
- [ ] Modais centralizados

### Tablet (768px - 1024px)
- [ ] Layout em 2 colunas
- [ ] Grid de projetos: 2 colunas
- [ ] Sidebar colapsível

### Mobile (<768px)
- [ ] Layout em 1 coluna
- [ ] Menu hamburger funciona
- [ ] Cards full-width
- [ ] Modais full-screen
- [ ] Botões com min-h-11 (44px) - fácil de tocar

### Teste de Zoom
- [ ] Zoom 150%: tudo legível e usável
- [ ] Zoom 200%: texto não quebra, layout responsivo
- [ ] Zoom 300%: ainda navegável (pode ter scroll horizontal)

---

## 🎭 ANIMAÇÕES

### Com animações (padrão)
- [ ] Fade in suave ao carregar páginas
- [ ] Hover: transição suave de cor
- [ ] Toggle: bolinha desliza suavemente
- [ ] Modal: fade in + scale
- [ ] Toast: slide in from top

### Com "Reduzir animações" ativado
- [ ] Transições instantâneas (sem fade)
- [ ] Hover: mudança imediata
- [ ] Toggle: snap imediato
- [ ] Modal: aparece instantâneo
- [ ] Toast: aparece instantâneo

---

## 🐛 ISSUES ENCONTRADOS

### Críticos (bloqueiam uso)
```
- [ ] Descrever bug crítico aqui
```

### Altos (prejudicam experiência)
```
- [ ] Descrever bug alto aqui
```

### Médios (melhorias visuais)
```
- [ ] Descrever bug médio aqui
```

### Baixos (polish)
```
- [ ] Descrever bug baixo aqui
```

---

## 🛠️ FERRAMENTAS RECOMENDADAS

### Lighthouse (Chrome DevTools)
1. Abrir DevTools (F12)
2. Ir em "Lighthouse"
3. Selecionar "Accessibility"
4. Rodar teste
5. **Meta:** Score > 95

### WebAIM Contrast Checker
https://webaim.org/resources/contrastchecker/
- Testar cores laranja (#e85002 dark, #d64400 light) contra fundos
- **Meta:** AA para textos pequenos (4.5:1)

### axe DevTools (Extensão Chrome)
https://www.deque.com/axe/devtools/
- Escaneia automaticamente problemas de acessibilidade
- **Meta:** 0 violações críticas

### WAVE (Extensão)
https://wave.webaim.org/extension/
- Visual feedback de problemas
- Identifica labels faltando, contraste ruim, etc

---

## ✅ CRITÉRIOS DE APROVAÇÃO

Para considerar o polimento visual **completo**, todos devem estar ✅:

### Contraste
- [ ] Lighthouse Accessibility Score > 95
- [ ] Todos os textos passam WCAG AA
- [ ] Textos pequenos (<18px) em laranja usam `.text-adaptive-primary`

### Interatividade
- [ ] Todos os botões têm loading states
- [ ] Todos os empty states são visualmente claros
- [ ] Todos os toasts são informativos
- [ ] Todos os forms validam antes de submit

### Acessibilidade
- [ ] Navegação por teclado 100% funcional
- [ ] Focus rings visíveis em todos os elementos
- [ ] Screen reader consegue navegar o app
- [ ] Zoom 200% mantém usabilidade

### Performance Percebida
- [ ] Skeleton loaders em listas principais
- [ ] Animações suaves (não distrativas)
- [ ] Feedback imediato em ações do usuário

---

**Tempo estimado:** 1-2 horas
**Última atualização:** 14/07/2026
