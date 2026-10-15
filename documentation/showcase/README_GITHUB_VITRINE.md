# ⚡ FitGesty — Enterprise Fitness Management Platform

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Node.js_v24+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Architecture-Zero--Dependency-8B5CF6?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/Database-SQLite_WAL_Native-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite Native" />
  <img src="https://img.shields.io/badge/Security-JWT_HMAC--SHA256-blue?style=for-the-badge" alt="JWT" />
  <img src="https://img.shields.io/badge/Tests-100%25_Pass_TDD-success?style=for-the-badge" alt="TDD 100%" />
  <img src="https://img.shields.io/badge/A11y-WCAG_2.1_AA-10B981?style=for-the-badge" alt="A11y WCAG AA" />
  <img src="https://img.shields.io/badge/License-MIT-gray?style=for-the-badge" alt="MIT License" />
</p>

> **FitGesty** é uma plataforma corporativa para gestão operacional de academias e centros esportivos, desenvolvida a partir de primeiros princípios em **Node.js puro com zero dependências externas**. O sistema centraliza o controle de matrículas, agendamento de espaços coletivos com transações atômicas ACID, delegação de tarefas operacionais (Kanban) e comunicados internos, integrado a um Design System com suporte nativo a acessibilidade digital (Alto Contraste e Fonte Ampliada).

---

## 🎯 Destaques do Projeto

* 🚀 **Zero Dependências de Terceiros:** Servidor HTTP nativo, roteador REST artesanal, autenticação JWT nativa e motor de persistência SQLite WAL desenvolvidos exclusivamente com a biblioteca padrão do Node.js. Nenhum framework externo, nenhum pacote do npm.
* 🛡️ **Persistência Relacional ACID & Concorrência:** Motor SQLite nativo com isolamento transacional estrito (`BEGIN IMMEDIATE`) para reservas de salas e espaços, garantindo consistência em cenários concorrentes e eliminando double-spend de vagas.
* ♿ **Acessibilidade Universal (WCAG 2.1 AA):** Alternância instantânea para modo de Alto Contraste (preto/amarelo com taxa de contraste $\ge 7:1$), ampliação tipográfica dinâmica e marcação semântica assistiva com atributos ARIA.
* 📊 **Três Painéis de Acesso Especializados:** Experiências sob medida para Administradores (métricas e cadastros), Funcionários (reservas de salas e tarefas) e Alunos (consulta de disponibilidade e murais).
* 🔒 **Motor de Validação Declarativo & JWT:** Regras de negócio estritas protegendo unicidade de e-mails, integridade de tipos, e controle RBAC assinado criptograficamente.

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

    subgraph Data["Persistência Relacional ACID"]
        DBEngine["SQLite Engine (node:sqlite)"]
        DB[("fitgesty.sqlite (WAL Mode)")]
    end

    Client -->|REST API Calls & HTML Requests| Mux
    Mux --> StaticEngine
    Mux --> AuthGuard
    AuthGuard --> DomainEngine
    DomainEngine --> DBEngine
    DBEngine <-->|BEGIN IMMEDIATE Transactions| DB
```

---

## ⚡ Início Rápido (Quickstart)

Sem necessidade de `npm install` ou configurações de banco de dados. Basta ter o [Node.js](https://nodejs.org/) v22+ ou v24+ instalado.

### 1. Iniciar o servidor
```bash
node backend/server.js
```

### 2. Acessar no navegador
Abra **`http://localhost:3000`**

O banco de dados relacional local (`backend/fitgesty.sqlite`) será gerado automaticamente com dados de demonstração na primeira inicialização.

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
POST   /api/login                  # Autenticação de perfil e emissão de JWT
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
POST   /api/resources/:id/reserve  # Reserva atômica de vaga
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

* 📑 [Laudo Pericial Forense (Tear + Noesis + Hermes)](../auditorias/LAUDO_PERICIAL_LEGADO.md)
* 🎓 [Artigo Técnico-Científico (Padrão SBC / IEEE)](../academico/ARTIGO_TECNICO_CIENTIFICO.md)
* 🪐 [Dossiê Epistêmico 90/10 & ADRs Retroativos](../academico/DOSSIE_EPISTEMICO_90_10.md)
* 💼 [Estudo de Caso para LinkedIn](POST_LINKEDIN.md)

---

## 👨‍💻 Autor

Desenvolvido por **Kazuhiro Kamimura**  
* GitHub: [@kazuhirokamim](https://github.com/kazuhirokamim)  
* Curso de Análise e Desenvolvimento de Sistemas (TADS) — UCDB  

---

## 📄 Licença

Este projeto está sob a licença [MIT](../../backend/package.json).
