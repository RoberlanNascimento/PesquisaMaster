# 06. UI Design System (Nocturne Editorial) & Regras de Composição Automática de Telas

## 1. Sistema de Design "Nocturne Editorial" (`07-design.md`)
Toda página do aplicativo DEVE ser envolvida pelo componente padrão `<StandardPageTemplate>` (`apps/web/src/components/layout/StandardPageTemplate.tsx`) e seguir rigorosamente a especificação de `docs/memory-bank/07-design.md`, centralizada em `apps/web/src/lib/designTokens.ts`, `apps/web/src/lib/themePalettes.ts` e `apps/web/src/nocturne-theme.css`:
- **Esquemas de Aparência (`dark` | `light` | `system`):**
  - **Modo Escuro (`dark` — Nocturne Editorial Dark):** Superfícies em carvão ergonômico (`surface-base` `#131313`, `surface-container-low` `#1b1c1c`, `surface-card` `#202020`, `surface-elevated` `#2a2a2a`, `border-subtle` `#353535`, `text-primary` `#e5e2e1`, `text-muted` `#9aa0a6`).
  - **Modo Claro (`light` — Nocturne Editorial Light):** Superfícies editoriais de alto contraste e baixa fadiga (`surface-base` `#f8f9fa`, `surface-container-low` `#f1f3f5`, `surface-card` `#ffffff`, `surface-elevated` `#f3f5f8`, `border-subtle` `#dce0e5`, `text-primary` `#1b1c1c`, `text-muted` `#5f6368`).
  - **Modo Sistema (`system`):** Detecta automaticamente a preferência do sistema operacional via `window.matchMedia('(prefers-color-scheme: light)')` e sincroniza `data-theme` (`dark` ou `light`) e `data-theme-mode` (`dark`, `light`, `system`) no elemento raiz.
  - **Seletor Interativo de Esquema (`ThemeModeSwitcher`):** Disponível no cabeçalho padrão (`<StandardPageTemplate>`), no topo do `<AppShellLayout>` e no menu lateral (`<SidebarNav>`), permitindo alternar instantaneamente entre **🌙 Escuro**, **☀️ Claro** e **💻 Sistema** para apresentar o design.
- **Camadas de Superfície (Dark Mode Ergonômico / Variáveis CSS Dinâmicas):**
  - Base Canvas (`surface-base` / `var(--surface-base)`): `#131313` (Escuro) / `#f8f9fa` (Claro)
  - Surface Container Low (`var(--surface-container-low)`): `#1b1c1c` (Escuro) / `#f1f3f5` (Claro)
  - Default Card Surface (`surface-card` / `var(--surface-card)`): `#202020` (Escuro) / `#ffffff` (Claro) com borda hairline `1px solid var(--border-subtle)` (`#353535` / `#dce0e5`) e raio `16px`
  - Elevated / Modals / Drawers (`surface-elevated` / `var(--surface-elevated)`): `#2a2a2a` (Escuro) / `#f3f5f8` (Claro) com borda `#424750` / `#c4c9d0` e sombra suave
- **Semântica Cromática de Ações & Botões (`07-design.md`):**
  - **Ação Primária (`+ Novo Registro`, `Salvar`, `Sincronizar`):** Fundo `#8ab4f8`, texto `#003061` (semibold), raio `12px`.
  - **Ação Secundária / Sucesso / Homologação (`✓ Autorizar`, `Aprovar TSE`):** Fundo `#183724` (Escuro) / `#e6f4ea` (Claro) com borda `#81c995` e texto `#a8dab5` / `#137333`.
  - **Ação de Edição & Alerta em Amarelo Pastel (`✏️ Editar`, `✏️ Ajustar`, `⚖️ Recalibrar Raking`, `Alertas`):** Container `#3b2e08` com borda `1px solid #fde293` e texto `#fde293` para botões de editar e badges de alerta; ou fundo sólido amarelo pastel `#fde293` / `#fdd663` com texto escuro `#332200` para travas/alertas de alta ênfase.
  - **Ação Destrutiva / Reprovação / Expurgo (`✕ Reprovar`, `Revogar Acesso`):** Fundo `#93000a` ou `#f28b82`, texto `#ffdad6` ou `#690005`.
  - **Ação Ghost / Outlined (`👁 Detalhes`, `Exportar`, `Cancelar`):** Fundo `var(--surface-card)`, borda `1px solid var(--border-subtle)`, texto `var(--text-primary)`.
- **Tipografia & Formatos (Escala Global +2pt / +2px):**
  - Fonte uniforme **`Roboto Flex`** com ajuste global de **+2pt (+2px)** em toda a escala tipográfica para maior legibilidade: `display-lg` 38px, `headline-lg` 30px, `headline-md` 22px, `title-md` 20px, `body-lg` 18px, `body-md` 16px, `label-md` 16px, `caption` 14px.
  - **Nota de Regra Permanente:** Todos os caracteres e tamanhos de fonte do sistema devem respeitar o acréscimo global de **+2 pontos (+2px)** sobre a escala base original.
  - Raios de borda: Cards/Painéis (`1rem` / `16px`), Inputs/Botões (`0.75rem` / `12px`), Chips/Badges/Pills (`9999px`).
  - Largura máxima de conteúdo: `1280px` centrada no `<StandardPageTemplate>`.

## 2. Arquitetura Minimalista da `<SidebarNav />` e Anatomia Obrigatória de Tela
O layout global do sistema NÃO utiliza barra de navegação superior (`<TopNavbar />` removida); toda a navegação e controle de sessão concentram-se na **Sidebar Lateral Fixa (`<SidebarNav />` — `apps/web/src/components/ui/SidebarNav.tsx` e `SidebarNavItems.ts`)** (`position: fixed; top: 0; left: 0; bottom: 0; width: 260px` expandida ou `72px` recolhida, com `overflow: hidden`) e na **área central de apresentação (`<StandardPageTemplate />`)**:

### 2.1. Regras de Design da `<SidebarNav />` (Estilo Minimalista em Pílula)
1. **Barra Superior Fixa da Sidebar (`sidebar-header-region`, `flex-shrink: 0`):**
   - Permanece **fixa no topo** quando a lista de módulos rola verticalmente.
   - **Menu Expandido (`260px`):** Exibe à esquerda a insígnia compacta da logo **`PM`** (`24px × 24px`, `font-size: 10px`, `border-radius: 6px`, reduzida em 30%) + o nome **`PesquisaMaster`**, e **ajustados à direita** (`margin-left: auto`) os botões monocromáticos de **Pesquisar (`⌕`)** (`btn-sidebar-search`) e **Recolher Menu (`◧`)** (`btn-toggle-sidebar`).
   - **Menu Recolhido (`72px`):** Os botões de pesquisar (`⌕`) e de recolher (`◧`), bem como o nome da empresa, ficam **totalmente ocultos**, restando apenas a logo **`PM`** centralizada. Ao **clicar na logo `PM`** com a sidebar recolhida, a navbar **expande novamente**.
2. **Corpo de Navegação Rolável (`<nav>`, `flex: 1; overflow-y: auto`):**
   - **Design Minimalista Monocromático:** Todos os botões de menu (`font-size: 16px`) e submenus (`font-size: 14px`) usam formato pílula (`border-radius: 9999px`), exibindo **apenas o ícone monocromático** (`◫`, `❐`, `▤`, `⊞`, `✎`, `⚙`, `◩`, `◰`, `◎`, `◳`, `◱`, `◲`, `⛨`, `⚖`, `⟠`, `◧`, `⚿`, `⊶`, `⊡`, `⌕`, `◬`, `◪`, `◈`) e o **nome do botão** — **sem linhas guias verticais** (`border-left: none`), sem setas (`↳`) e sem chevrons (`▼`).
   - **Comportamento Acordeão de Submenus:** Clicar em um botão que possui submenus na lista principal (**Gestão de Pesquisas TSE** [`Pesquisas`, `Composição de Pesquisas`, `Construtor de Questionários`]) **expande** seus subitens; clicar novamente nele mesmo ou clicar em qualquer outro botão de menu **recolhe automaticamente** os subitens abertos. Os grupos `Configurações`, `Empresa` e `Auditoria` não ficam na lista principal da sidebar, sendo acessados pelo menu suspenso no rodapé.
3. **Barra Inferior Fixa da Sidebar (`sidebar-footer-region`, `flex-shrink: 0`) e Menu Suspenso de Configurações (`SidebarSettingsDropdown`):**
   - Permanece **fixa no rodapé** da sidebar e apresenta exclusivamente:
     - **Menu Expandido (`260px`):** Layout horizontal (`flex-direction: row`). À esquerda: avatar circular (`HV`, `26px × 26px`) e **nome do usuário conectado** (`Dra. Helena Vasconcelos`); à direita: botão de **Configurações (`⚙`)** (`btn-sidebar-footer-settings`);
     - **Menu Recolhido (`72px`):** Layout vertical invertido (`flex-direction: column-reverse`). O botão de **Configurações (`⚙`)** posiciona-se **acima do ícone do usuário conectado** (`sidebar-user-avatar`), centralizado horizontalmente (`gap: 12px`, `padding: 14px 8px`);
     - **Menu Suspenso Flutuante (`sidebar-settings-dropdown`):** Acionado pelo botão `⚙`, abre ancorado ao rodapé com grupos em `font-size: 16px` e itens em `font-size: 14px` (subitens `13px`), contendo:
       - Grupo **Configurações**: botões **Planejamento Amostral** (`/plano-amostral`) e **Regiões** (que expande **País**, **Estados**, **Municípios**, **Regiões** e **Bairros**, linkados às suas respectivas telas exclusivas de CRUD);
       - Grupo **Empresa**: botões **Gerenciar** (`nav-client-company` $\rightarrow$ `/clientes`), **Usuários** (`nav-users-rbac` $\rightarrow$ `/usuarios-rbac`) e **Pesquisadores** (`nav-researchers` $\rightarrow$ `/pesquisadores`);
       - Grupo **Auditoria**: botão **Auditoria** (`nav-security-audit` $\rightarrow$ `/auditoria-antiga`), linkado à página de Auditoria Hash-Chain SHA-256.

### 2.2. As 6 Zonas Estruturais da Área Central (`<StandardPageTemplate />`)
Nenhuma tela pode ser entregue apenas com uma tabela solta. Na **área central**, as páginas envolvidas pelo `<StandardPageTemplate>` devem conter as 6 zonas estruturais abaixo:
1. **Workspace Header:** Título principal (`H1`) em `#e5e2e1` (`headline-md` bold), subtítulo explicativo em `#9aa0a6` e botões de ação global à direita (`Exportar`, `+ Novo Registro`).
2. **Navigation Tabs (Guias de Contexto):** Abas horizontais com contador numérico (`Todos (142)`, `Ativos (128)`, `Com Alerta (6)`, `Inativos (8)`), sincronizadas com o estado/rota.
3. **KPI Summary Cards:** Cartões executivos em `#202020` (`border: 1px solid #353535`) resumindo os totais da visão atual.
4. **Filter & Combobox Bar:** Grade responsiva com Comboboxes tipados + campo de busca com *debounce* (300ms) + botão `Limpar Filtros`.
5. **Data Grid com Ações de Linha e de Lote:**
   - Cabeçalho fixo (`#1b1c1c`, texto `13px` uppercase bold em `#9aa0a6`);
   - Seleção múltipla via checkbox com barra flutuante de ação em lote;
   - Coluna final à direita (`text-right`) reservada exclusivamente para os botões rápidos de CRUD (`👁 Ver`, `✏️ Editar`, `🚫 Inativar/Reprovar`).
   - Rodapé de paginação com seletor de itens por página (`10`, `25`, `50`, `100`) e contador total de registros.
6. **Modal Dialog Form (`<SlideOverDrawer />`):**
   - Formulários de criação e edição NUNCA devem navegar para outra página vazia e perder o filtro da grade; abrem centralizados em tela (`SlideOverDrawer`) com backdrop blur (`rgba(0,0,0,0.68)` e `blur(6px)`), cantos arredondados generosos (`24px`), superfície `#202124`, sem divisórias rígidas entre cabeçalho, corpo e rodapé, e validados via `React Hook Form` + `Zod`.

## 3. Os 5 Estados Obrigatórios em Toda Tela (Zero Telas Quebradas)
O Agente é PROIBIDO de marcar uma tela como pronta sem implementar:
1. **Loading State (`isLoading`):** Linhas de `Skeleton` pulsantes na grade (proibido exibir apenas texto "Carregando..." sem estrutura).
2. **Empty State (`items.length === 0`):** Ilustração/ícone centralizado informando que nenhum dado corresponde aos comboboxes + botão rápido `Limpar Filtros` ou `+ Cadastrar Primeiro Item`.
3. **Error State (`isError`):** Banner padronizado exibindo o `detail` e o `correlation_id` da API (RFC 7807) + botão `Tentar Novamente`.
4. **Mutation Feedback (`isSubmitting`):** Todo botão de salvar, validar ou excluir deve ficar desabilitado (`disabled:opacity-50`) durante a chamada HTTP e disparar um `Toast` de confirmação ao concluir.
5. **RBAC UI Guard:** Botões de criação, edição ou aprovação devem verificar o papel do usuário logado (`usePermission()`), ocultando ou desabilitando ações não permitidas pelo perfil.