# 05. Progress Tracker — Plataforma Eleitoral, Tabulação TSE e Agregador

Legenda: `[ ]` Pendente | `[~]` Em Andamento | `[x]` Concluído e Validado (`verify-all.sh == 0`)

## Épico 1: Fundação, Infraestrutura, Segurança e Auditoria Hash-Chain
- [x] 1.0 Governança Agêntica (`.clinerules` + `memory-bank` + scripts de verificação)
- [x] 1.1 Modelagem Completa do Banco de Dados em `docs/database-erd.mmd` (PostgreSQL + Geometria Espacial)
- [x] 1.2 Setup Base FastAPI + SQLAlchemy 2.0 Async + Alembic + Middleware RFC 7807 + Structlog
- [x] 1.3 Motor de Autenticação JWT + RBAC Estrito (6 perfis) + Device Binding para Pesquisadores
- [x] 1.4 Tabela e Serviço de Auditoria Imutável (`security_audit_logs` com encadeamento SHA-256)

## Épico 2: Planejamento Amostral TSE e Motor de Questionários
- [x] 2.1 CRUD de Pesquisas Eleitorais com Metadados Obrigatórios do TSE (PesqEle) e Travamento de Status
- [x] 2.2 Motor de Questionários Dinâmicos (Espontânea, Estimulada com Rodízio de Disco, Rejeição e Skip Logic)
- [x] 2.3 Motor Matemático de Amostragem Estratificada e Alocação Inteira de Cotas (Hare-Niemeyer)
- [x] 2.4 Distribuição de Cotas e Perímetros Geográficos (Setores/Bairros) por Pesquisador

## Épico 3: Coleta em Campo, Controle de Pesquisadores e Antifraude
- [x] 3.1 Endpoint de Sincronização em Lote Idempotente (`Idempotency-Key` + Assinatura HMAC da Coleta)
- [x] 3.2 Validador Antifraude Automático (Geofencing GPS, Tempo Mínimo de Entrevista, Duplicidade e Cotas)
- [x] 3.3 Painel de Supervisão de Campo (Mapa de Coletas, Desempenho por Pesquisador e Fluxo de Expurgo Auditável)
- [x] 3.4 Interface Web/PWA Offline-First do Pesquisador (Armazenamento Local Seguro, Rodízio de Cartão e Fila de Sync)

## Épico 4: Ponderação Raking (IPF), Tabulação TSE e Relatórios Cruzados
- [x] 4.1 Algoritmo de Pós-Estratificação *Iterative Proportional Fitting* (Raking) + Cálculo de DEFF (Kish)
- [x] 4.2 Motor SQL de Tabulação Rápida (`FILTER` Pivoting): Votos Totais, Votos Válidos, Rejeição e Margem de Erro por Estrato
- [x] 4.3 Gerador de Tabelas de Contingência (*Crosstabs* Demográficos) e Exportação de Relatórios (PDF/XLSX/Pacote TSE)
- [x] 4.4 Dashboard Analítico Interativo no Frontend (Gráficos de Cenários, Simulação de 2º Turno e Filtros Cruzados)

## Épico 5: Agregador de Pesquisas Eleitorais (Polling Aggregator)
- [x] 5.1 Cadastro de Pesquisas Externas/Internas, Cenários e Pesos Metodológicos de Institutos
- [x] 5.2 Motor de Média Móvel Ponderada (Peso por $\sqrt{N}$, Decaimento Exponencial Temporal e *House Effects*)
- [x] 5.3 Painel Visual do Agregador (Curva de Tendência Histórica, Banda de Confiança e Tabela Comparativa de Institutos)

## Épico 6: Hardening, Testes E2E e Deploy em Produção
- [x] 6.1 Suíte E2E (Playwright) cobrindo o fluxo completo: Criação → Coleta → Auditoria → Raking → Relatório TSE
- [x] 6.2 Dockerfiles Multi-Stage, GitHub Actions CI/CD e Instrumentação OpenTelemetry/Sentry

## Épico 7: Fundação do Design System Corporativo & Camada de Telas (Frontend `apps/web/`)
- [x] 7.1 Shell Corporativo e Segurança RBAC (`AppShellLayout.tsx`, `AppShellSidebar.tsx`, `RbacGuard.tsx`)
- [x] 7.2 Componentes Mestre de Design System (`EnterpriseCrudWorkspace.tsx`, `SlideOverDrawer.tsx`, `ConfirmDialogModal.tsx`)
- [x] 7.3 TELA 1: Gestão de Pesquisas Eleitorais e Registro TSE (`/pesquisas`)
- [x] 7.4 TELA 2: Construtor de Questionários Dinâmicos e Rodízio de Disco (`/questionarios`)
- [x] 7.5 TELA 3: Planejamento Amostral e Cotas Hare-Niemeyer (`/plano-amostral`)
- [x] 7.6 TELA 4: Controle de Pesquisadores e Vínculo de Aparelhos (`/pesquisadores`)
- [x] 7.7 TELA 5: Mesa de Homologação de Campo e Antifraude (`/homologacao-campo`)
- [x] 7.8 TELA 6: Motor de Tabulação TSE, Raking (IPF) e Relatórios Cruzados (`/tabulacao-tse`)
- [x] 7.9 TELA 7: Agregador Eleitoral (`/agregador`) & Gestão de Usuários RBAC (`/usuarios-rbac`)
- [x] 7.10 Quality Gate Automatizado (`ui-completeness.spec.ts` + `ui-completeness.test.tsx` + Verificação estrita de <= 250 linhas)
- [x] 7.11 Navegação Hierárquica: Construtor de Questionários integrado como submenu oficial de Gestão de Pesquisas TSE com atalhos contextuais diretos na grade e no cabeçalho.
- [x] 7.12 Construtor de Questionários com Botões CRUD Completos: Ações globais (`+ Nova Pergunta`, `📥 Exportar TSE`, `👁 Abrir Simulador`) e de linha (`⬆️/⬇️ Reordenar`, `✏️ Editar`, `📋 Clonar`, `🚫 Excluir` com modal de confirmação). Suíte de testes atualizada (10/10 testes passando).
- [x] 7.13 Menu Suspenso de Configurações (`SidebarSettingsDropdown.tsx`): Botão `⚙` no rodapé da `SidebarNav` abre o menu suspenso flutuante com os grupos **Configurações** (`◩ Planejamento Amostral` e `◰ Regiões` $\rightarrow$ `◎ País`, `◳ Estados`, `◱ Municípios`, `◰ Regiões`, `◲ Bairros`), **Empresa** (`◧ Gerenciar`, `⚿ Usuários`, `⊶ Pesquisadores`) e **Auditoria** (`◈ Auditoria`), removendo todos esses itens da lista principal da `SidebarNav`.
- [x] 7.14 Menu Empresa com Submenus Gerenciar, Usuários e Controle de Pesquisadores: Menu `◧ Empresa` unificado agregando os submenus `◧ Gerenciar`, `⚿ Usuários` e `⊶ Controle de Pesquisadores`, com contadores e rotas perfeitamente integrados.
- [x] 7.15 Conclusão da Etapa 1 (Módulo Comercial SaaS): Gestão de planos de assinatura (`Starter`, `Pro`, `Enterprise`), medidores de consumo de cotas (pesquisas, entrevistas, dispositivos), histórico de faturamento e download de NF-e na aba `3. Plano SaaS & Faturamento` (11/11 testes passando).
- [x] 7.16 Conclusão Integral da Etapa 1 (Backend API SaaS & Clientes): Implementação do módulo `apps/api/src/modules/clients/` (`models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`, `__init__.py`), registro de rotas `/api/v1/clients` e `/api/v1/saas/plans` no FastAPI `main.py`, com validação em banco assíncrono, trilha de auditoria SHA-256 e suite de testes 100% verde (27/27 testes API + 11/11 testes Web).
- [x] 7.17 Conclusão Integral das Etapas 2 a 7 da Esteira Operacional (`mapa-sequencia-saas-relatorio.md`): Anexo do Espelho PesqEle TSE em PDF (Etapa 2), Editor Visual de Lógica de Salto Branching If/Else (Etapa 3), Carga Dinâmica de Questionário e Captura Automática de GPS no PWA (Etapa 4), Auditoria de Trecho de Áudio e Assinatura Digital ECDSA (Etapa 5), Exportador de Matriz de Contingência XLSX Jornalístico (Etapa 6) e Gerador de Dossiê Executivo em PDF com Ficha Técnica TSE (Etapa 7). Todos os 39 testes automatizados (12 Web + 27 API) 100% aprovados.
- [x] 7.18 Pilar 6 (`regions`) — Gerenciamento de Regiões Municipais e Bairros conforme o Plano Diretor: Backend completo (`apps/api/src/modules/regions/` com rotas `/api/v1/regions`, `/api/v1/regions/countries`, `/api/v1/regions/states`, `/api/v1/regions/municipalities` e `/api/v1/regions/{id}/neighborhoods`, `Decimal` `NUMERIC(19,4)`, auditoria SHA-256 e `test_regions.py`) + Frontend completo (`apps/web/src/features/regions/` em conformidade com `07-design.md` Nocturne Editorial, `<StandardPageTemplate>` e botões amarelo pastel).
- [x] 7.19 Menu Configurações (`Planejamento Amostral` e `Regiões`) com 5 Telas Exclusivas de CRUD (`País` com Brasil configurado por padrão, `Estados`, `Municípios`, `Regiões` e `Bairros`) e comboboxes hierárquicos em cascata (`CountriesCrudScreen.tsx`, `StatesCrudScreen.tsx`, `MunicipalitiesCrudScreen.tsx`, `MunicipalRegionsFeature.tsx`, `NeighborhoodsCrudScreen.tsx`), validados com 14/14 testes Web e 100% de aderência ao limite de <= 250 linhas.
- [x] 7.20 Submenu **Composição de Pesquisas** (`/composicao-pesquisas`) adicionado ao grupo **Gestão de Pesquisas TSE** (`SidebarNavItems.ts`, `AppShellNavItems.ts`, `App.tsx`, `SurveyCompositionFeature.tsx`, `SurveyCompositionDrawerForm.tsx`, `surveyCompositionConfig.tsx`, `surveyCompositionData.ts`) para juntar, ordenar e homologar os questionários vinculados às pesquisas.
- [x] 7.21 Esquemas de Tema **Escuro (`dark`)**, **Claro (`light`)** e **Sistema (`system`)** baseados em `06-ui-design-system.md`: Implementação de `themePalettes.ts`, variáveis CSS dinâmicas em `nocturne-theme.css`, `ThemeModeSwitcher.tsx` e `DesignSchemeShowcasePanel.tsx` integrados ao `<StandardPageTemplate>`, `<AppShellLayout>` e `<SidebarNav>`, com suíte automatizada `theme-schemes.test.tsx`.
- [x] 7.22 Implementação Integral das Telas dos 6 Pilares e 28 Tabelas do Banco de Dados (`01-project-brief.md`): Criação e alinhamento de todas as telas faltantes (`ScalesCatalogFeature.tsx`, `AnswerOptionsCatalogFeature.tsx`, `BatteryItemsCatalogFeature.tsx`, `FieldTransferFeature.tsx`, `ScenarioCandidatesFeature.tsx`, `TabulationReportsFeature.tsx`), novos endpoints FastAPI assíncronos em `tables_router.py`, expansão das rotas em `appRoutes.ts`, resolução dinâmica em `WorkspaceTabResolver.tsx` e botões nos menus (`SidebarNavItems.ts` e `SidebarSettingsDropdown.tsx`). 100% de conformidade com limite de 250 linhas, contratos OpenAPI sincronizados, 23 testes no Vitest e 28 testes no Pytest aprovados.
- [x] 7.22 Layout enxuto de tela inteira: Sidebar fixa desde o topo (`position: fixed; top: 0`) à esquerda (contendo no topo apenas a logo `PM`, o nome da empresa `PesquisaMaster` e a lupa de pesquisa `🔍`) e área central de apresentação das páginas (`<StandardPageTemplate>`) à direita, com remoção da `TopNavbar` e do cabeçalho interno redundante (`standard-page-header`).
