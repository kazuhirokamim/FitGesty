# PLAN-001-seguranca-e-sqlite
Status: Proposto
Issue: #1
Data: 2026-10-15

## Metadados SDD
- versao_plano: 2.0.0
- tipo: feature
- blast_radius: médio
- orcamento_tokens: 15000

## Não-Objetivos / Fora de Escopo
- Não adicionar dependências externas do npm (o projeto deve manter zero dependências em package.json).
- Não reescrever o frontend com frameworks SPA como React, Vue ou Svelte nesta iteração.
- Não implementar suporte a bancos de dados externos remotos como PostgreSQL ou MySQL.

## Contexto e Problema
O sistema FitGesty opera como um protótipo acadêmico em Node.js puro sem dependências externas. A auditoria forense identificou limitações críticas:
1. Persistência em arquivo plano `db.json` com `fs.writeFileSync` síncrono e risco de perda de dados.
2. Race condition (double-spend) na reserva de vagas de salas.
3. Vulnerabilidade de Stored XSS por concatenação via `.innerHTML +=` no frontend.
4. Ausência de controle de sessão e autorização (RBAC) com rotas abertas.
5. Cobertura de testes automatizados inexistente (0.0%).

## Requisitos EARS

| REQ | Tipo | Declaração |
| :--- | :--- | :--- |
| REQ-001 | ubiquitous | O sistema deve persistir todos os dados de membros, recursos, tarefas e comunicados no banco de dados SQLite nativo node:sqlite com modo WAL habilitado. |
| REQ-002 | event | Quando o endpoint POST /api/resources/:id/reserve for acionado, o sistema deve executar uma transação atômica que decrementa available em 1 se available for maior que zero. |
| REQ-003 | unwanted | Se uma requisição de reserva for recebida quando available for menor ou igual a zero, o sistema deve retornar o status HTTP 409 Conflict. |
| REQ-004 | ubiquitous | O sistema deve sanitizar todos os dados textuais de alunos, tarefas, recursos e comunicados exibidos nas tabelas e cards do frontend contra injeção de script Stored XSS. |
| REQ-005 | event | Quando credenciais válidas forem enviadas para POST /api/login, o sistema deve emitir um token JWT assinado com HMAC-SHA256 e validade de 24 horas. |

## Orçamentos Não-Funcionais
- Latência p95 de leitura e escrita inferior a 50ms para 1.000 registros.
- Zero dependências externas no package.json (0 pacotes npm).
- Mínimo de 80% de cobertura de testes automatizados com node:test.
- Teto orçamentário máximo de 700 linhas por arquivo de código (Regra Tear #24).

## Hotspots Compartilhados
- backend/server.js
- frontend/public/styles.css

## T1
- Requisitos: REQ-001
- Agent: tear-database
- Model: inherit
- Effort: médio
- Tempo: 15m
- Depends-on: nenhuma

## T2
- Requisitos: REQ-002, REQ-003
- Agent: tear-backend
- Model: inherit
- Effort: médio
- Tempo: 20m
- Depends-on: T1

## T3
- Requisitos: REQ-005
- Agent: tear-security
- Model: inherit
- Effort: médio
- Tempo: 15m
- Depends-on: T1

## T4
- Requisitos: REQ-004
- Agent: tear-frontend
- Model: inherit
- Effort: médio
- Tempo: 20m
- Depends-on: T2, T3

## T5
- Requisitos: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- Agent: tear-qa
- Model: inherit
- Effort: alto
- Tempo: 30m
- Depends-on: T1, T2, T3, T4

## Matriz de Rastreabilidade

| REQ | TAREFA | TESTE |
| :--- | :--- | :--- |
| REQ-001 | T1, T5 | test/server.test.js#sqlite-crud |
| REQ-002 | T2, T5 | test/server.test.js#atomic-reserve |
| REQ-003 | T2, T5 | test/server.test.js#reserve-conflict |
| REQ-004 | T4, T5 | test/server.test.js#xss-sanitization |
| REQ-005 | T3, T5 | test/server.test.js#jwt-auth |

## 🛡️ Critérios de Aceite (Definition of Done)
* [ ] Zero pacotes npm instalados (`dependencies` e `devDependencies` vazios).
* [ ] Banco de dados operando em `backend/fitgesty.sqlite` em modo WAL com integridade transacional.
* [ ] 100% dos testes unitários passando em `node --test` com cobertura $\ge 80\%$.
* [ ] Zero vulnerabilidades de Stored XSS nas páginas HTML.
* [ ] Concorrência protegida em reserva de salas com rollback/erro caso não haja vagas.
* [ ] Limite de 700 linhas por arquivo respeitado (Regra Tear #24).
