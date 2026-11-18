# 04. Active Context (Estado Atual de Trabalho)

## 1. Foco da Sessão Atual
- **Módulo Ativo:** `Camada de Interface Corporativa & Hierarquia Territorial Completa (Pilar 6)`
- **Objetivo Imediato:** Consistência e alinhamento integral entre Backend (`apps/api/`), Frontend (`apps/web/`) e documentação de governança (`docs/memory-bank/` e `.clinerules`/`CLAUDE.md`), garantindo 100% de conformidade com `07-design.md`, limites de modularidade ($\le 250$ linhas por arquivo) e testes automatizados.

## 2. Últimas Alterações Realizadas
- **Pilar 6 (`01-project-brief.md`) — Hierarquia Territorial & 5 Telas Exclusivas de CRUD (`regions`):**
  - **Menu `⚙️ Configurações` (`SidebarNavItems.ts`, `SidebarNav.tsx`, `AppShellNavItems.ts`, `AppShellSidebar.tsx`, `store.ts`, `App.tsx`):**
    - Contém os itens **`Planejamento Amostral`** (`/plano-amostral`) e **`Regiões`**, que aninha os 5 subitens com telas exclusivas de CRUD:
      1. **`🌎 País`** (`/regioes/pais` — `CountriesCrudScreen.tsx`): Configurado por padrão com o **Brasil (`BR` — TSE)**;
      2. **`🏛️ Estados`** (`/regioes/estados` — `StatesCrudScreen.tsx`): CRUD exclusivo de UFs com combobox de País (padrão Brasil);
      3. **`🏙️ Municípios`** (`/regioes/municipios` — `MunicipalitiesCrudScreen.tsx` & `MunicipalityDrawerForm.tsx`): CRUD exclusivo de Municípios com comboboxes em cascata (**País $\rightarrow$ Estado/UF**);
      4. **`🗺️ Regiões`** (`/regioes-municipais` — `MunicipalRegionsFeature.tsx` & `RegionDrawerForm.tsx`): CRUD exclusivo de Regiões Municipais com comboboxes em cascata (**País $\rightarrow$ Estado/UF $\rightarrow$ Município**);
      5. **`🏘️ Bairros`** (`/regioes/bairros` — `NeighborhoodsCrudScreen.tsx` & `TerritorialCrudDrawers.tsx`): CRUD exclusivo de Bairros com 4 comboboxes em cascata (**País $\rightarrow$ Estado/UF $\rightarrow$ Município $\rightarrow$ Região Municipal**).
  - **Estado Reativo Compartilhado (`regionsStore.ts`):** Store Zustand (`useTerritorialStore`) mantendo País padrão (`Brasil`), Estados, Municípios, Regiões e Bairros sincronizados entre todas as 5 telas.
  - **Backend FastAPI (`apps/api/src/modules/regions/`):** Modelos SQLAlchemy 2.0 (`CountryModel`, `StateModel`, `MunicipalityModel`, `MunicipalRegionModel`, `NeighborhoodModel`), schemas (`schemas.py`, `schemas_hierarchy.py`), repositórios (`repository.py`, `repository_hierarchy.py`), serviços (`service.py`, `service_hierarchy.py`) e rotas REST completas (`router.py`, `router_hierarchy.py`) registradas em `main.py` com precisão `NUMERIC(19, 4)` / `Decimal` e auditoria SHA-256.
- **Página Padrão (`StandardPageTemplate`) e Design System Nocturne Editorial (`06-ui-design-system.md` & `07-design.md`):**
  - `docs/memory-bank/06-ui-design-system.md` e `07-design.md`: Documentos mestres do sistema de design **Nocturne Editorial** com suporte completo aos esquemas **Escuro (`dark` — `#131313` $\rightarrow$ `#202020`)**, **Claro (`light` — `#f8f9fa` $\rightarrow$ `#ffffff`)** e **Sistema (`system` — `prefers-color-scheme`)**, preservando primário `#8ab4f8`, sucesso `#81c995`/`#a8dab5`, amarelo pastel `#fde293`/`#3b2e08` para alertas e botões `✏️ Editar`, erro `#f28b82` e fonte `Roboto Flex`.
  - `src/lib/themePalettes.ts`, `src/lib/designTokens.ts` e `src/nocturne-theme.css`: Tokens tipados (`NOCTURNE_TOKENS`, `NOCTURNE_BUTTON_STYLES`, `THEME_PALETTES`) e folha de estilo global reativa a `:root[data-theme="dark"]` e `:root[data-theme="light"]`.
  - `src/components/ui/ThemeModeSwitcher.tsx` e `src/components/ui/DesignSchemeShowcasePanel.tsx`: Seletor interativo de tema (**🌙 Escuro**, **☀️ Claro**, **💻 Sistema**) e painel comparativo de amostras cromáticas integrados à `<SidebarNav>` (`top: 0`, com região de topo contendo apenas logo `PM`, nome da empresa `PesquisaMaster` e botão de lupa de pesquisa `🔍`) e `<AppShellLayout>`.
  - `src/components/layout/StandardPageTemplate.tsx`: Template padrão enxuto que envolve todas as rotas em `App.tsx` e `AppShellLayout.tsx` na área central à direita da `<SidebarNav />`, sem navbar superior nem cabeçalho interno redundante.
- **Etapas 1 a 7 da Esteira Operacional (`mapa-sequencia-saas-relatorio.md`):**
  - **Etapa 1 (Módulo Comercial SaaS & Clientes):** `ClientSubscriptionSubscreen.tsx`, `ClientCompanyRegistrationFeature.tsx` e módulo backend `apps/api/src/modules/clients/` (`/api/v1/clients` e `/api/v1/saas/plans`).
  - **Etapa 2 a 7:** Anexo do Espelho PesqEle TSE em PDF, Editor Visual de Lógica de Salto Branching If/Else, Carga Dinâmica de Questionário e Captura Automática de GPS no PWA (`ResearcherPwaFeature.tsx`), Auditoria de Áudio e Assinatura Digital ECDSA (`PackageInspectionDrawer.tsx`), Exportador de Matriz de Contingência XLSX (`TseTabulationFeature.tsx`) e Dossiê Executivo em PDF (`IntegratedOverviewFeature.tsx` & `OverviewCharts.tsx` com gráficos verticais 1 por linha).
- **Mapa Completo de Telas Corporativas Integradas:**
  - **TELA 0 (`/overview`):** Dashboard Executivo & Síntese da Última Pesquisa (`IntegratedOverviewFeature.tsx` & `OverviewCharts.tsx`).
  - **TELA 1 (`/pesquisas`):** Gestão de Pesquisas Eleitorais e Registro TSE (`SurveysManagementFeature.tsx` & `SurveyDrawerForm.tsx` conectado às amostras reais do PostgreSQL).
  - **TELA 1B (`/composicao-pesquisas`, `/pesquisas/cenario-candidatos`, `/pesquisas/disco-candidatos`):** Composição de Pesquisas (`SurveyCompositionFeature.tsx`), Cartelas (`ScenarioCandidatesFeature.tsx`) e Disco de Candidatos.
  - **TELA 1C (`/distribuicao`):** Distribuição Visual de Pesquisas & Profissionais Aptos (`DistribuicaoPesquisasFeature.tsx`), com seleção de pesquisa, bairros/setores (`bairros_ibge`), vinculação em lote em `atribuicao_pesquisadores` e desvinculação imediata.
  - **TELA 2 (`/questionarios`, `/questionarios/roteamento`):** Construtor de Questionários Dinâmicos (`QuestionnairesBuilderFeature.tsx`) e Roteamento & Saltos.
  - **TELA 3 (`/plano-amostral`, `/amostragem/variaveis-controle`, `/amostragem/matriz-cotas`):** Planejamento Amostral & Cotas Hare-Niemeyer (`SamplingQuotasFeature.tsx`) conectado ao PostgreSQL (`amostras`, `amostras_dimensao`, `amostras_cotas`) e conferência oficial TSE/IBGE (`POST /api/v1/integracoes/conferir-municipio/{id_municipio}`), com cálculo em tela, salvamento, edição, reversão e distribuição proporcional por bairros.
  - **TELA 4 (`/pesquisadores`):** Controle de Pesquisadores e Vínculo de Aparelhos (`ResearchersManagementFeature.tsx` & `ResearcherDrawerForm.tsx` com criação/edição no banco) + Operações de Campo, Transferências, Reatribuições, Sessões e Logs (`CampoOperacoesFeature.tsx`).
  - **TELA 5 (`/homologacao-campo`, `/coleta-pwa`, `/supervisao`):** Coleta PWA Offline/GPS (`ResearcherPwaFeature.tsx`), Mesa de Homologação de Campo (`FieldHomologationFeature.tsx`) e Supervisão.
  - **TELA 6 (`/tabulacao-tse`, `/tabulacao/ficha-eleitor`, `/tabulacao/sessoes-campo`, `/tabulacao/respostas`, `/tabulacao/relatorios`):** Motor de Tabulação TSE, Raking (IPF) e Relatórios Cruzados (`TseTabulationFeature.tsx`, `VoterRespondentsFeature.tsx`, `FieldSessionsFeature.tsx`, `RawAnswersFeature.tsx`).
  - **TELA 7 (`/agregador`, `/usuarios-rbac`, `/auditoria`, `/auditoria/reatribuicao`):** Agregador Eleitoral (`AggregatorContainer.tsx`), Gestão de Usuários RBAC com revogação/estatístico (`RbacUsersFeature.tsx`) e Auditoria (`SecurityAuditFeature.tsx`, `AuditReassignmentFeature.tsx`).
  - **TELA 8 (`/clientes`):** Gestão da Empresa Contratante (`organizacoes`), Colaboradores (`usuarios`) e Assinatura SaaS (`ClientCompanyRegistrationFeature.tsx`).
  - **TELA 9 (`/regioes/pais`, `/regioes/estados`, `/regioes/municipios`, `/regioes-municipais`, `/regioes/bairros`, `/geografia/demografia-ibge`, `/geografia/eleitorado-tse`):** Hierarquia Territorial & Zonas Municipais (`CountriesCrudScreen.tsx`, `StatesCrudScreen.tsx`, `MunicipalitiesCrudScreen.tsx`, `MunicipalRegionsFeature.tsx` conectado a `regiao_zonas`, `NeighborhoodsCrudScreen.tsx`, `DemographyIbgeFeature.tsx`, `ElectorateTseFeature.tsx`).
  - **TELA 10 (`/catalogo/*`):** Catálogos de Candidatos/Produtos, Perguntas, Itens de Bateria, Escalas e Opções de Resposta.

- **Mapeamento das 34 Tabelas do Banco de Dados PostgreSQL (`pesquisas`) e Telas Dedicadas:**
  - **Pilar 1 (Geografia e Censitário):**
    - `municipios`: `/regioes/municipios` (`MunicipalitiesCrudScreen.tsx`)
    - `regiao_zonas`: `/regioes-municipais` (`MunicipalRegionsFeature.tsx`)
    - `bairros_ibge`: `/regioes/bairros` (`NeighborhoodsCrudScreen.tsx`)
    - `demografia_ibge`: `/censo/demografia` (`DemographicsFeature.tsx`)
    - `eleitorado_tse`: `/censo/eleitorado` (`ElectorateTseFeature.tsx`)
  - **Pilar 2 (Amostras):**
    - `amostras`: `/plano-amostral` (`SamplingQuotasFeature.tsx`)
    - `amostras_dimensao`: `/amostras/dimensoes` (`SampleDimensionsFeature.tsx`)
    - `amostras_cotas`: `/amostras/cotas` (`SampleQuotasFeature.tsx`)
  - **Pilar 3 (Pesquisas):**
    - `pesquisas`: `/pesquisas` (`SurveysManagementFeature.tsx`)
    - `candidatos_produtos`: `/catalogo/candidatos` (`CandidatesCatalogFeature.tsx`)
    - `cenarios_pesquisa`: `/pesquisas/cenarios` (`ScenariosCatalogFeature.tsx`)
    - `cenario_candidatos`: `/pesquisas/cenario-candidatos` (`ScenarioCandidatesFeature.tsx`)
  - **Pilar 4 (Questionários):**
    - `grupos_opcoes`: `/catalogo/escalas` (`ScalesCatalogFeature.tsx`)
    - `opcoes_resposta`: `/catalogo/opcoes-resposta` (`AnswerOptionsCatalogFeature.tsx`)
    - `perguntas`: `/catalogo/perguntas` (`QuestionsCatalogFeature.tsx`)
    - `itens_bateria`: `/catalogo/itens-bateria` (`BatteryItemsCatalogFeature.tsx`)
    - `questionarios`: `/questionarios` (`QuestionnairesBuilderFeature.tsx`)
    - `questionario_perguntas`: `/composicao-pesquisas` (`SurveyCompositionFeature.tsx`)
  - **Pilar 5 (Administração, RBAC & Campo):**
    - `organizacoes`: `/clientes` (`ClientCompanyRegistrationFeature.tsx`)
    - `papeis_rbac`: `/usuarios-rbac` (`RbacUsersFeature.tsx`)
    - `permissoes_rbac`: `/usuarios-rbac` (`RolePermissionsModal.tsx`)
    - `papel_permissoes`: `/usuarios-rbac` (`RolePermissionsModal.tsx`)
    - `usuarios`: `/usuarios-rbac` (`RbacUsersFeature.tsx`)
    - `sessoes_refresh_tokens`: `/pesquisadores` (`CampoOperacoesFeature.tsx`)
    - `logs_autenticacao`: `/pesquisadores` (`CampoOperacoesFeature.tsx`)
    - `profissionais`: `/cadastros/profissionais` (`ProfessionalsFeature.tsx`)
    - `atribuicao_pesquisadores`: `/pesquisadores` (`ResearchersManagementFeature.tsx`)
    - `transferencias_atribuicao`: `/logistica/transferencia-saldo` (`FieldTransferFeature.tsx`)
    - `historico_reatribuicao_questionarios`: `/auditoria/reatribuicoes` (`ReassignmentHistoryFeature.tsx`)
    - `historico_desbloqueio_pesquisas`: `/auditoria/desbloqueios` (`UnlockHistoryFeature.tsx`)
  - **Pilar 6 (Tabulação e Coleta):**
    - `pessoas`: `/coleta/entrevistados` (`InterviewsAuditFeature.tsx`)
    - `questionarios_pessoas`: `/homologacao-campo` (`FieldHomologationFeature.tsx`)
    - `respostas`: `/auditoria/respostas` (`AnswersFeature.tsx`)
    - `relatorios_tabulacao`: `/tabulacao/relatorios` (`TabulationReportsFeature.tsx`)

## 3. Próximos Passos Imediatos
- Todas as 34 tabelas do banco de dados e os 6 Pilares de Domínio (`01-project-brief.md`) possuem telas dedicadas, rotas no roteador do cliente, endpoints backend assíncronos e itens nos menus de navegação (`PRIMARY_NAV_ITEMS` e `SidebarSettingsDropdown.tsx`).
- Suite de testes completa com 23 testes passando no Vitest, 28 testes passando no Pytest, 0 violações de linha (todos os arquivos $\le 250$ linhas) e sincronização OpenAPI 3.1.
