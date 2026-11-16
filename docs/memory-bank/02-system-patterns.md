# 02. System Patterns (Arquitetura e Padrões Técnicos)

## 1. Fluxo de Requisição (Backend)
`HTTP Request` → `CorrelationID & Auth Middleware` → `Router (DTO In)` → `Service (Unit of Work / RBAC / Business Rules)` → `Repository (SQLAlchemy Async)` → `PostgreSQL` → `Router (DTO Out)`.

## 2. Padrão de Paginação e Resposta de Coleções
Nenhum endpoint de listagem (`GET`) pode retornar listas abertas. Aceite parâmetros de consulta `limit` (padrão `20`, máximo `100`) e `offset` (padrão `0`) — ou `page`/`page_size` equivalentes — retornando sempre o envelope padronizado:
```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0,
  "page": 1,
  "page_size": 20,
  "has_next": false
}
```

## 3. Padrão de Erros (RFC 7807 — Problem Details)
Toda exceção de domínio (`DomainError`) ou falha de validação deve retornar HTTP Status apropriado com payload:
```json
{
  "type": "https://pesquisamaster.local/errors/domain-error",
  "title": "Erro de Regra de Negócio",
  "status": 422,
  "detail": "Descrição clara da violação.",
  "instance": "/api/v1/recurso",
  "correlation_id": "00000000-0000-0000-0000-000000000000"
}
```
