# FitGestão

Sistema de gestão para academias desenvolvido como projeto da disciplina de DAC — 5º Semestre TADS/UCDB.

## Visão Geral

FitGestão é uma aplicação web cliente-servidor que centraliza o gerenciamento de alunos, recursos físicos, tarefas operacionais e comunicados internos de uma academia. O sistema possui três perfis de acesso distintos com painéis dedicados para cada tipo de usuário.

---

## Estrutura do Projeto

```
FitGestao/
├── backend/
│   ├── server.js          # Servidor HTTP nativo + API REST completa
│   ├── db.json            # Banco de dados em arquivo JSON (gerado automaticamente)
│   ├── package.json       # Configuração do projeto Node.js
│   └── package-lock.json  # Lockfile de dependências
│
├── frontend/
│   └── public/
│       ├── login.html       # Página de entrada do sistema
│       ├── admin.html       # Painel administrativo completo
│       ├── funcionario.html # Painel do funcionário (reservas e tarefas)
│       ├── aluno.html       # Área do aluno (comunicados e disponibilidade)
│       ├── app.js           # Lógica JS do painel administrativo
│       ├── aluno.js         # Lógica JS da área do aluno
│       └── styles.css       # Estilos globais do sistema
│
├── .gitignore
└── README.md
```

---

## Tecnologias Utilizadas

- **Backend:** Node.js puro (sem frameworks externos)
- **Frontend:** HTML5, CSS3 e JavaScript vanilla
- **Armazenamento:** JSON file-based (sem banco de dados externo)
- **Dependências externas:** nenhuma

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior

---

## Como Executar

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd FitGestao
```

### 2. Acesse a pasta do backend

```bash
cd backend
```

### 3. Inicie o servidor

```bash
node server.js
```

O sistema estará disponível em: **http://localhost:3000**

---

## Credenciais de Acesso (Protótipo)

| Perfil       | Usuário       | Senha |
|-------------|---------------|-------|
| Administrador | `admin`      | `x`   |
| Funcionário   | `funcionario` | `x`   |
| Aluno         | `aluno`       | `x`   |

---

## Fluxo do Sistema

```
http://localhost:3000
        │
        ▼
   login.html
        │
   ┌────┴────────────────┐
   │                     │
   ▼                     ▼                     ▼
admin.html       funcionario.html         aluno.html
(Painel Admin)   (Reservas e Tarefas)   (Comunicados e Recursos)
```

---

## Funcionalidades por Perfil

### Administrador (`admin.html`)
- Dashboard com indicadores operacionais (alunos ativos, tarefas pendentes, recursos alocados)
- Cadastro, edição e exclusão de alunos (com suporte a necessidades de acessibilidade)
- Gerenciamento de recursos físicos: equipamentos e salas
- Kanban de tarefas da equipe (Pendente / Em Andamento / Concluída)
- Publicação de comunicados segmentados por público-alvo

### Funcionário (`funcionario.html`)
- Controle de ocupação de salas com reserva e liberação de vagas
- Visualização e atualização de status das tarefas atribuídas
- Mural de comunicados internos

### Aluno (`aluno.html`)
- Consulta de comunicados relevantes
- Disponibilidade em tempo real de equipamentos e salas

---

## API REST

O backend expõe os seguintes endpoints:

| Método | Endpoint                  | Descrição                          |
|--------|---------------------------|------------------------------------|
| POST   | `/api/login`              | Autenticação e redirecionamento     |
| GET    | `/api/health`             | Status do servidor                  |
| GET    | `/api/dashboard`          | Indicadores consolidados            |
| GET    | `/api/members`            | Listar alunos (suporta `?q=` e `?status=`) |
| POST   | `/api/members`            | Cadastrar aluno                     |
| PUT    | `/api/members/:id`        | Atualizar aluno                     |
| DELETE | `/api/members/:id`        | Remover aluno                       |
| GET    | `/api/resources`          | Listar recursos                     |
| POST   | `/api/resources`          | Cadastrar recurso                   |
| PUT    | `/api/resources/:id`      | Atualizar recurso                   |
| DELETE | `/api/resources/:id`      | Remover recurso                     |
| GET    | `/api/tasks`              | Listar tarefas                      |
| POST   | `/api/tasks`              | Criar tarefa                        |
| PUT    | `/api/tasks/:id`          | Atualizar tarefa                    |
| DELETE | `/api/tasks/:id`          | Remover tarefa                      |
| GET    | `/api/announcements`      | Listar comunicados                  |
| POST   | `/api/announcements`      | Criar comunicado                    |
| DELETE | `/api/announcements/:id`  | Remover comunicado                  |

---

## Banco de Dados

O arquivo `backend/db.json` é criado automaticamente na primeira execução com dados de exemplo. Ele armazena as quatro coleções do sistema:

- `members` — alunos cadastrados
- `resources` — equipamentos e salas
- `tasks` — tarefas operacionais
- `announcements` — comunicados

> O `db.json` está no `.gitignore` e não deve ser versionado em produção.

---

## Decisões de Arquitetura

- **Sem frameworks:** o backend utiliza apenas módulos nativos do Node.js (`http`, `fs`, `path`, `crypto`), sem Express ou similares, atendendo ao escopo da disciplina.
- **Validação declarativa:** o motor de validação do servidor cobre campos obrigatórios, unicidade de e-mail, integridade numérica de recursos e domínios de enum para status e prioridade.
- **Arquivos estáticos servidos pelo próprio backend:** não há servidor de arquivos separado — o `server.js` serve o frontend diretamente.
- **Autenticação simplificada:** login por credenciais fixas com persistência de role via `localStorage`, adequado ao escopo de protótipo acadêmico.

---

## Acessibilidade

O sistema foi desenvolvido com atenção às diretrizes de acessibilidade:

- Suporte a **alto contraste** e **fonte ampliada** ativáveis por botão
- Uso de atributos `aria-*` e roles semânticos no HTML
- Campo de necessidades de acessibilidade no cadastro de alunos
- Indicador no dashboard de alunos com necessidades específicas registradas

---

## Equipe

Projeto desenvolvido pela equipe do 5º Semestre de TADS — UCDB, para a disciplina de Desenvolvimento de Aplicações Corporativas (DAC).
