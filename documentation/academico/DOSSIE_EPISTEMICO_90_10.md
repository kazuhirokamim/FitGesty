# 🪐 DOSSIÊ EPISTÊMICO 90/10 & ADRs RETROATIVOS
## Sistema FitGestão — Destilação por Primeiros Princípios e Arquitetura de Decisão

**Destilação Epistêmica:** Noesis Epistemic Miner & Architecture Maestro  
**Formato de Registro:** Padrão MADR 4.0 (Markdown Architectural Decision Records)  
**Projeto:** FitGestão (DAC 5º Semestre TADS / UCDB)  
**Autor:** Kazuhiro Kamimura (`github.com/kazuhirokamim`)  

---

## 🧭 PARTE 1: A MATRIZ EPISTÊMICA 90/10

Na engenharia de software de alta densidade, a **Regra 90/10** estabelece que $90\%$ do comportamento emergente e do valor de um sistema derivam de apenas $10\%$ de invariantes atômicos e axiomas fundamentais de domínio. Todo o restante é infraestrutura de transporte, serialização e renderização.

No sistema **FitGestão**, esses 10% são formados por cinco invariantes matemáticos e de integridade:

### Axioma 1: Princípio da Não-Vacuidade da Identidade
$$\forall x \in \text{Entities}, \quad \text{id}(x) \in \text{UUIDv4} \quad \land \quad \text{createdAt}(x) \in \text{ISO8601}$$
*Toda entidade que ingressa no espaço amostral do sistema recebe uma chave primária universalmente única gerada por entropia criptográfica (`crypto.randomUUID()`) e uma coordenada temporal imutável de criação.*

### Axioma 2: Lei da Conservação da Vaga Física
$$\forall r \in \text{Resources}, \quad \begin{cases} 
\text{quantity}(r) \in \mathbb{Z}^+ \\
\text{available}(r) \in \mathbb{N} \\
0 \le \text{available}(r) \le \text{quantity}(r)
\end{cases}$$
*A quantidade de vagas ou unidades operacionais disponíveis de um recurso não pode ser negativa (proibição de sub-alocação) e não pode ultrapassar o inventário físico total do estabelecimento (proibição de super-alocação).*

### Axioma 3: Invariante de Exclusão Mútua de Comunicação (Unicidade de E-mail)
$$\forall m_i, m_j \in \text{Members}, \quad i \neq j \implies \text{normalize}(\text{email}(m_i)) \neq \text{normalize}(\text{email}(m_j))$$
*O grafo de membros não admite arestas duplicadas sobre o identificador de comunicação externa. O e-mail constitui um índice de unicidade funcional.*

### Axioma 4: Máquina de Estados Finita e Confinada (FSM)
Os estados operacionais de Alunos, Recursos e Tarefas operam estritamente sobre conjuntos finitos fechados de valores canônicos:
$$\mathcal{S}_{\text{Members}} = \{\text{'Ativo'}, \text{'Pendente'}, \text{'Inativo'}\}$$
$$\mathcal{S}_{\text{Resources}} = \{\text{'Disponível'}, \text{'Reservado'}, \text{'Manutenção'}\}$$
$$\mathcal{S}_{\text{Tasks}} = \{\text{'Pendente'}, \text{'Em andamento'}, \text{'Concluída'}\}$$
*Qualquer transição ou mutação que induza um estado fora desses fechos algébricos é rejeitada na fronteira do motor de validação com status HTTP 400.*

### Axioma 5: Princípio da Soberania Perceptiva (Acessibilidade Não-Destrutiva)
$$\text{Render}(\text{UI}, \text{State}, \text{Mode}) = \text{Layout}(\text{UI}) \oplus \text{A11yTheme}(\text{Mode})$$
*A ativação de recursos de alto contraste ou ampliação tipográfica ($120\%$) não recalcula ou invalida a topologia do DOM; opera puramente por comutação de tokens de design via variáveis CSS (`--bg`, `--text`, `--primary`), garantindo taxa de contraste $\ge 7:1$ sem quebra de fluxo.*

---

## 🏛️ PARTE 2: REGISTRO DE DECISÕES ARQUITETURAIS RETROATIVAS (ADRs)

---

### ADR-001: Adoção de Node.js Nativo sem Dependências Externas (Zero-Dependency)

* **Status:** Ratificado e Implementado
* **Data:** Maio de 2024 (Formalizado retroativamente em Outubro de 2026)
* **Decisores:** Kazuhiro Kamimura
* **Contexto:** A disciplina de Desenvolvimento de Aplicações Corporativas (DAC) exigia a entrega de um protótipo funcional para avaliação de competências de backend, manipulação de protocolos de rede e arquitetura de software.

#### Decisão Tomada
Decidiu-se construir o servidor HTTP, o parser de payloads, o roteamento REST e a camada de sanitização de arquivos exclusivamente com a biblioteca padrão do Node.js (`http`, `fs`, `path`, `crypto`), sem recorrer ao Express.js, Fastify ou qualquer biblioteca externa do repositório npm.

#### Consequências
* **Positivas:**
  * Zero vulnerabilidades de terceiros introduzidas na árvore de pacotes (*zero CVEs* de dependências).
  * Inicialização ultrarrápida do processo (< 50ms) e pegada de memória RAM irrisória (< 30MB).
  * Domínio pleno do ciclo de vida das requisições e dos streams de rede no runtime do Node.js.
  * O projeto roda em qualquer ambiente Node.js v18+ sem necessidade de executar `npm install`.
* **Negativas / Limitações:**
  * Necessidade de escrever manualmente rotinas utilitárias como parseamento de JSON em streams e sanitização de MIME types.
  * O roteador HTTP é baseado em condicionais manuais (`if (pathname === ...)`), o que dificulta o escalonamento para dezenas de rotas complexas com múltiplos middlewares.

---

### ADR-002: Persistência em Arquivo Plano JSON Único (`backend/db.json`)

* **Status:** Ratificado e Implementado
* **Data:** Maio de 2024
* **Decisores:** Kazuhiro Kamimura
* **Contexto:** O protótipo precisava persistir dados de demonstração sem exigir que a banca examinadora ou os corretores instalassem e configurassem instâncias de bancos de dados relacionais (PostgreSQL/MySQL) ou NoSQL (MongoDB).

#### Decisão Tomada
Adotou-se um arquivo JSON plano (`db.json`) manipulado diretamente via `fs.readFileSync` e `fs.writeFileSync`, com provisionamento automático de dados iniciais (*seed*) na ausência do arquivo em disco (`ensureDb`).

#### Consequências
* **Positivas:**
  * Portabilidade total: o estado da aplicação viaja com o próprio código-fonte ou é auto-gerado no primeiro arranque.
  * Inspeção humana direta e imediata do banco de dados abrindo o arquivo `db.json` em qualquer editor de texto.
  * Nenhuma dependência de drivers nativos compilados via node-gyp.
* **Negativas / Limitações:**
  * Operações de escrita reescrevem o arquivo inteiro em disco de forma síncrona ($O(N)$), bloqueando transitoriamente o Event Loop do Node.js.
  * Ausência de suporte a transações ACID concorrentes e risco de perda de dados se o processo for finalizado abruptamente durante a escrita.

---

### ADR-003: Autenticação Baseada em Perfis Simulados no Frontend e LocalStorage

* **Status:** Ratificado e Implementado
* **Data:** Maio de 2024
* **Decisores:** Kazuhiro Kamimura
* **Contexto:** O sistema precisava demonstrar a segregação de telas e visões entre três perfis de usuários distintos (Administrador, Funcionário e Aluno) durante a apresentação acadêmica.

#### Decisão Tomada
Implementou-se a rota `/api/login` com validação de credenciais estáticas de demonstração (`admin`, `funcionario`, `aluno` com senha `x`). Ao autenticar com sucesso, o frontend armazena a role do usuário no `localStorage` do navegador (`fit_role`) e redireciona para a tela correspondente.

#### Consequências
* **Positivas:**
  * Simplicidade de demonstração: a banca pode alternar entre os três perfis de acesso em segundos sem necessidade de cadastros prévios de e-mail ou tokens temporários.
  * Fluxo limpo e direto na interface com badges informativos de perfil ativo.
* **Negativas / Limitações:**
  * Falta de segurança criptográfica no backend: o servidor não emite nem valida tokens assinados (como JWT) nas rotas de API subsequentes.
  * Qualquer usuário que envie requisições HTTP diretas para `/api/members` ou `/api/tasks` possui privilégios irrestritos de exclusão e edição.

---

### ADR-004: Co-localização de Ativos Estáticos e Servidor REST no Mesmo Processo

* **Status:** Ratificado e Implementado
* **Data:** Maio de 2024
* **Decisores:** Kazuhiro Kamimura
* **Contexto:** Simplificação do pipeline de execução local, eliminando a necessidade de iniciar dois servidores simultâneos (ex: servidor Vite/Webpack para frontend e servidor Node.js para backend).

#### Decisão Tomada
O arquivo `backend/server.js` foi configurado para verificar se a rota requisitada inicia com `/api/`. Em caso negativo, mapeia e serve os arquivos do diretório `frontend/public/` através da função `sendStatic`, aplicando cabeçalho `Cache-Control: no-store` para desenvolvimento.

#### Consequências
* **Positivas:**
  * Comando único para iniciar todo o ecossistema: `node server.js` disponibiliza backend e frontend em `http://localhost:3000`.
  * Ausência de problemas de CORS durante a navegação pelo navegador, visto que frontend e backend compartilham a mesma origem (*same-origin*).
* **Negativas / Limitações:**
  * I/O de arquivos estáticos concorre no mesmo thread com o processamento das regras de negócio da API.

---

### ADR-005: Sistema de Design Cyber-Purple com Tokens Nativos de Acessibilidade

* **Status:** Ratificado e Implementado
* **Data:** Maio de 2024
* **Decisores:** Kazuhiro Kamimura
* **Contexto:** Necessidade de criar uma interface visual contemporânea, elegante e diferenciada para o setor fitness, sem negligenciar as exigências de acessibilidade para usuários com baixa visão ou sensibilidade a luz.

#### Decisão Tomada
Desenvolveu-se uma folha de estilos personalizada (`styles.css`) fundamentada em variáveis CSS (*CSS Custom Properties*) com uma paleta de estética *Dark Cyber-Purple* (tons de roxo neon `#a78bfa`, grafite `#07090f` e verde esmeralda `#10b981`), complementada por classes globais `.high-contrast` (modo preto e amarelo de contraste absoluto) e `.large-font` (escala tipográfica em $120\%$).

#### Consequências
* **Positivas:**
  * Identidade visual de alto impacto estético e percepção de produto profissional.
  * Total conformidade com as diretrizes de acessibilidade WCAG 2.1 AA sem uso de bibliotecas pesadas de acessibilidade.
  * Controle direto por botões táteis no cabeçalho de todas as telas com feedback acessível via `aria-pressed`.
* **Negativas / Limitações:**
  * O arquivo `styles.css` acumulou 1043 linhas, concentrando estilos globais e regras pontuais de diferentes telas em um único documento, o que demanda modularização em versões futuras.
