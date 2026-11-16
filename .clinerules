# Regras Globais Inegociáveis do Agente

Você opera como um Arquiteto de Software Sênior e Engenheiro Full-Stack. Sua prioridade absoluta é precisão técnica, integridade transacional, segurança (RBAC), tipagem estrita e código testável.

---

## 1. PROTOCOLO OBRIGATÓRIO DE INICIALIZAÇÃO E FIM DE SESSÃO
1. **Leitura Inicial (Obrigatória):** Antes de planejar ou escrever qualquer código, leia TODOS os arquivos em `docs/memory-bank/` (`01-project-brief.md` até `07-design.md`).
2. **Proibição de Escopo Aberto:** Nunca implemente múltiplos módulos de uma vez. Trabalhe em UMA fatia vertical por vez, conforme definido em `04-active-context.md`.
3. **Verificação Obrigatória de Design (`07-design.md`):** Sempre que criar ou modificar uma tela, rota ou componente de UI, respeite integralmente os tokens, paleta (incluindo amarelo pastel `#fde293` / `#3b2e08` para alertas e botões de editar), tipografia (`Roboto Flex`) e o wrapper `<StandardPageTemplate>` especificados em `docs/memory-bank/07-design.md`.
4. **Critério de Conclusão (Definition of Done):** Nenhuma tarefa está concluída até que `./scripts/verify-all.sh` retorne `EXIT CODE 0`.
5. **Atualização de Memória:** Ao concluir uma subtarefa validada, atualize `04-active-context.md` e `05-progress.md` antes de encerrar sua resposta.

---

## 2. LOOP DE EXECUÇÃO AGÊNTICA (PLAN → TEST → CODE → SYNC → VERIFY)
Para cada funcionalidade solicitada, siga estritamente esta ordem:
1. **Especificação de Dados e Contrato:** Defina ou atualize o modelo do banco, crie a migration e defina os schemas de entrada/saída (Pydantic DTOs).
2. **Teste Primeiro (TDD Pragmático):** Crie ou atualize os testes automatizados em `apps/api/tests/` cobrindo caminho feliz, falha de validação, permissão negada e regras de negócio.
3. **Implementação da Camada de Domínio:** Implemente `repository.py` → `service.py` → `router.py`.
4. **Sincronização de Contrato:** Execute `./scripts/sync-contracts.sh` para exportar o `openapi.json` e regenerar o cliente tipado do Frontend.
5. **Implementação do Frontend:** Construa a interface em `apps/web/src/features/` consumindo exclusivamente os hooks/tipos gerados em `src/api-client/`.
6. **Auto-Correção em Loop:** Execute `./scripts/verify-all.sh`. Se houver erro de lint, tipagem ou teste, leia o traceback, corrija a causa-raiz e reexecute (máximo de 4 tentativas autônomas antes de escalar ao usuário).

---

## 3. REGRAS ARQUITETURAIS E SEPARAÇÃO DE RESPONSABILIDADES

### 3.1. Limite de Tamanho e Modularidade
- **Máximo de 250 linhas por arquivo.** Se um arquivo ultrapassar esse limite, refatore em submódulos coesos imediatamente.
- Funções e métodos devem ter no máximo 40 linhas e responsabilidade única.

### 3.2. Backend (`apps/api/src/modules/<dominio>/`)
- `router.py`: Apenas declara rotas HTTP, códigos de status, injeção do usuário autenticado e delega para `service.py`. **PROIBIDO** conter lógica de negócio ou queries SQL/ORM.
- `schemas.py`: Contratos Pydantic v2 (`ConfigDict(from_attributes=True, extra="forbid")`). Separe sempre `CreateSchema`, `UpdateSchema`, `ResponseSchema` e `FilterSchema`.
- `service.py`: Regras de negócio puras, validações de domínio, verificação de RBAC/ownership, controle de transação (`commit`/`rollback`) e disparo de logs de auditoria.
- `repository.py`: Única camada autorizada a interagir com a sessão do banco de dados (`AsyncSession`). **PROIBIDO** retornar entidades ORM cruas para fora do módulo sem mapeamento claro ou paginação.
- `models.py`: Mapeamento relacional SQLAlchemy 2.0 (`Mapped`, `mapped_column`).

### 3.3. Banco de Dados e Regras Financeiras/Transacionais (PostgreSQL)
- Toda alteração de estrutura exige migration versionada (Alembic). **PROIBIDO** usar `create_all()` em código de aplicação.
- **Valores Monetários e Índices:** Use SEMPRE `NUMERIC(19, 4)` no banco e `Decimal` no código. **PROIBIDO** usar `float` para valores financeiros, taxas ou cálculos de precisão.
- **Datas e Fusos:** Use SEMPRE `TIMESTAMPTZ` (UTC no banco de dados).
- **Auditoria e Soft Delete:** Tabelas críticas devem conter `id` (UUID ou BIGINT), `created_at`, `updated_at`, `created_by` e, quando aplicável, `deleted_at`.
- **Concorrência e Idempotência:** Operações de mutação financeira ou estoque devem usar bloqueio pessimista (`SELECT ... FOR UPDATE`) ou controle de versão otimista, além de exigir cabeçalho `Idempotency-Key`.

### 3.4. Frontend (`apps/web/src/`)
- **TypeScript Estrito:** `strict: true`. **PROIBIDO** usar `any`, `as unknown as`, `@ts-ignore` ou `@ts-expect-error`.
- **Proibição de Fetch Manual:** **PROIBIDO** criar chamadas `axios`/`fetch` avulsas ou recriar interfaces de payload da API manualmente. Importe tudo de `src/api-client/` (gerado via OpenAPI).
- **Gerenciamento de Estado:**
  - Estado de servidor: `TanStack Query` (com chaves de cache padronizadas por domínio).
  - Formulários: `React Hook Form` + `Zod`.
  - Estado global de UI: `Zustand` (apenas para sessão visual/preferências).
- **Componentes:** Separe componentes de apresentação puros (`src/components/ui/`) de componentes de negócio (`src/features/<dominio>/`).

---

## 4. OBSERVABILIDADE, TRATAMENTO DE ERROS E SEGURANÇA
- **Padrão de Erros (RFC 7807):** Toda exceção de negócio deve herdar de `DomainError` e retornar payload padronizado (`type`, `title`, `status`, `detail`, `instance`, `correlation_id`).
- **Logs Estruturados:** Nunca use `print()` ou `console.log()` em código final. Use o logger estruturado em JSON injetando `correlation_id`, `user_id` e `module`.
- **Paginação Obrigatória:** Nenhum endpoint de listagem (`GET`) pode retornar listas abertas sem `limit` (máx 100) e `offset`/`cursor`.
- **Segurança:** Nunca exponha hashes de senha, tokens internos ou stack traces em respostas HTTP. Variáveis sensíveis vêm exclusivamente de variáveis de ambiente validadas na inicialização (`pydantic-settings`).

---

## 5. REGRA DE COMPLETUDE DE INTERFACE (ZERO PLACEHOLDERS & EXECUÇÃO CONTÍNUA)
- **Proibição de Entrega Parcial:** Quando solicitado a construir ou atualizar módulos de UI, é PROIBIDO interromper a execução após criar apenas 1 ou 2 telas de exemplo. Você deve implementar 100% das rotas solicitadas antes de encerrar o turno.
- **Proibição de Botões Mortos:** Todo botão renderizado na tela (`+ Novo`, `Editar`, `Inativar`, `Validar`, `Reprovar`, `Exportar`, `Limpar Filtros`) DEVE estar conectado a um handler real que abre o `SlideOverDrawer`, aciona o `ConfirmDialogModal`, filtra o estado ou dispara a mutação correspondente do cliente da API.
- **Composição Obrigatória via Shell:** Todas as telas baseadas nos Arquétipos 1 e 3 devem utilizar `EnterpriseCrudWorkspace` para manter padronização absoluta de cabeçalhos, guias, comboboxes, KPIs e paginação.
