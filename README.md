# ⚡ FitGestão — Enterprise Fitness Management Platform

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Node.js_v24+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Architecture-Zero--Dependency-8B5CF6?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/Database-SQLite_WAL_Native-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite Native" />
  <img src="https://img.shields.io/badge/Security-JWT_HMAC--SHA256-blue?style=for-the-badge" alt="JWT" />
  <img src="https://img.shields.io/badge/Tests-100%25_Pass_TDD-success?style=for-the-badge" alt="TDD 100%" />
  <img src="https://img.shields.io/badge/A11y-WCAG_2.1_AA-10B981?style=for-the-badge" alt="A11y WCAG AA" />
  <img src="https://img.shields.io/badge/License-MIT-gray?style=for-the-badge" alt="MIT License" />
</p>

> **FitGestão** é uma plataforma corporativa para gestão operacional de academias e centros esportivos, desenvolvida a partir de primeiros princípios em **Node.js puro com zero dependências externas**. O sistema centraliza o controle de matrículas, agendamento de espaços coletivos com transações atômicas ACID, delegação de tarefas operacionais (Kanban) e comunicados internos, integrado a um Design System com suporte nativo a acessibilidade digital (Alto Contraste e Fonte Ampliada).

---

## 🎯 Destaques do Projeto

* 🚀 **Zero Dependências Externas (Zero-Dependency):** Servidor HTTP nativo, roteador REST artesanal, autenticação JWT via `node:crypto` e banco de dados SQLite nativo via `node:sqlite`. Nenhum framework pesado, nenhum pacote de terceiro instalado via npm.
* 🛡️ **Persistência Relacional ACID & Concorrência:** Migração do armazenamento JSON para **SQLite em modo WAL (`PRAGMA journal_mode = WAL`)** com isolamento transacional estrito (`BEGIN IMMEDIATE`) para reservas de salas e espaços, eliminando race conditions e double-spend de vagas.
* 🔒 **Segurança Reforçada (OWASP Hardening):** Tokens JWT nativos (HMAC-SHA256) com tempo de expiração (`exp`), mitigação completa de Cross-Site Scripting (XSS) com sanitização de output (`escapeHtml`), e headers de proteção de sessão.
* ♿ **Acessibilidade Universal (WCAG 2.1 AA):** Alternância instantânea para modo de Alto Contraste (preto/amarelo com taxa de contraste $\ge 7:1$), ampliação tipográfica dinâmica e marcação semântica assistiva com atributos ARIA.
* 🧪 **Suíte de Testes Automatizados TDD (Node.js Test Runner):** 26 testes unitários e de integração cobrindo os 3 cenários obrigatórios (Happy Path, Edge Case, Error Path) com mais de 90% de cobertura de código.
* 📊 **Três Painéis de Acesso Especializados:** Experiências sob medida para Administradores (métricas e cadastros), Funcionários (reservas de salas e tarefas) e Alunos (consulta de disponibilidade e murais).

---

## 🏛️ Arquitetura do Sistema

```mermaid
flowchart LR
    subgraph Client["Camada de Apresentação (Browser)"]
        UI_A["admin.html (Painel Admin)"]
        UI_F["funcionario.html (Operação)"]
        UI_S["aluno.html (Portal Aluno)"]
        A11Y["CSS Tokens (Dark / High-Contrast)"]
    end

    subgraph Core["Servidor Node.js Nativo (Zero-Dependency)"]
        Mux["HTTP Server & Request Router"]
        StaticEngine["Static File Delivery & MIME Mapping"]
        AuthGuard["JWT Auth & RBAC Security Guard"]
        DomainEngine["Validation Engine & Business Rules"]
    end

    subgraph Persistence["Camada de Dados ACID"]
        DBEngine["SQLite Engine (node:sqlite)"]
        WAL[("fitgestao.sqlite (WAL Mode)")]
    end

    Client -->|REST API (Bearer JWT)| Mux
    Mux --> StaticEngine
    Mux --> AuthGuard
    AuthGuard --> DomainEngine
    DomainEngine --> DBEngine
    DBEngine <-->|BEGIN IMMEDIATE Transactions| WAL
```

---

## ⚡ Início Rápido (Quickstart)

Sem necessidade de `npm install` ou configurações externas. Basta possuir o [Node.js](https://nodejs.org/) (v22.5+ ou v24+ com suporte nativo a `node:sqlite`).

### 1. Iniciar o servidor
```bash
node backend/server.js
```

### 2. Acessar no navegador
Abra **`http://localhost:3000`**

O banco de dados relacional local (`backend/fitgestao.sqlite`) será gerado automaticamente com dados de demonstração na primeira inicialização.

### 3. Executar a Suíte de Testes
```bash
node --test
```
Ou com relatório de cobertura nativo:
```bash
node --test --experimental-test-coverage
```

---

## 🔑 Credenciais de Acesso (Demonstração)

| Perfil | Usuário | Senha | Painel de Destino | Principais Recursos |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `x` | `admin.html` | Dashboard macro, cadastro de alunos, gestão de equipamentos e tarefas. |
| **Funcionário** | `funcionario` | `x` | `funcionario.html` | Reserva de salas e espaços, atualização de status de tarefas e avisos. |
| **Aluno** | `aluno` | `x` | `aluno.html` | Consulta em tempo real de equipamentos livres e mural de comunicados. |

---

## 📡 Endpoints da API REST

O backend provê uma API RESTful completa e padronizada sob `/api`:

```http
POST   /api/login                  # Autenticação, emissão de JWT e autorização
GET    /api/health                 # Heartbeat e telemetria do servidor
GET    /api/dashboard              # Métricas consolidadas em tempo real
GET    /api/members                # Listagem de alunos (suporta ?q= e ?status=)
POST   /api/members                # Cadastro de novo aluno com validação
PUT    /api/members/:id            # Atualização cadastral do aluno
DELETE /api/members/:id            # Remoção física do registro
GET    /api/resources              # Inventário de equipamentos e salas
POST   /api/resources              # Cadastro de recurso patrimonial
PUT    /api/resources/:id          # Atualização de status e disponibilidade
DELETE /api/resources/:id          # Baixa de equipamento/espaço
POST   /api/resources/:id/reserve  # Reserva atômica de vaga (Hermes Transact Guard)
POST   /api/resources/:id/release  # Liberação atômica de vaga
GET    /api/tasks                  # Consulta de tarefas operacionais
POST   /api/tasks                  # Criação e atribuição de tarefa
PUT    /api/tasks/:id              # Atualização de status/conclusão
DELETE /api/tasks/:id              # Exclusão de tarefa
GET    /api/announcements          # Leitura de comunicados oficiais
POST   /api/announcements          # Emissão de comunicado segmentado
DELETE /api/announcements/:id      # Exclusão de comunicado
```

---

## 📚 Documentação Técnica e Registros Acadêmicos

Este repositório foi submetido a uma auditoria forense completa e formalizado academicamente em conformidade com padrões da SBC / IEEE:

* 📑 [Laudo Pericial Forense (Tear + Noesis + Hermes)](documentation/auditorias/LAUDO_PERICIAL_LEGADO.md)
* 🎓 [Artigo Técnico-Científico (Padrão SBC / IEEE)](documentation/academico/ARTIGO_TECNICO_CIENTIFICO.md)
* 🪐 [Dossiê Epistêmico 90/10 & ADRs Retroativos](documentation/academico/DOSSIE_EPISTEMICO_90_10.md)
* 📐 [Plano de Implementação V1.5](docs/plans/PLAN-001-seguranca-e-sqlite.md)
* 🏛️ [ADR-006: Migração para SQLite Nativo e Hardening](docs/adr/ADR-006-migracao-sqlite-e-hardening.md)
* 💼 [Estudo de Caso para LinkedIn](documentation/showcase/POST_LINKEDIN.md)

---

## 👨‍💻 Autor

Desenvolvido por **Kazuhiro Kamimura**  
* GitHub: [@kazuhirokamim](https://github.com/kazuhirokamim)  
* Curso de Análise e Desenvolvimento de Sistemas (TADS) — UCDB  

---

## 📄 Licença

Este projeto está sob a licença [MIT](backend/package.json).
