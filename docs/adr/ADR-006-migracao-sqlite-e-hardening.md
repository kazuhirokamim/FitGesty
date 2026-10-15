---
numero: 6
titulo: Migração para SQLite Nativo e Hardening de Segurança
status: Proposto
data: 2026-10-15
autores: ["Kazuhiro Kamimura", "Antigravity"]
aplica_a: ["backend/**", "frontend/**"]
tags: ["sqlite", "seguranca", "hardening", "transacoes"]
---

# ADR-006: Migração para SQLite Nativo e Hardening de Segurança

## Decisão

No contexto de refatoração do backend FitGesty, enfrentando limitações de concorrência e integridade do arquivo db.json, decidimos por migrar a camada de dados para SQLite nativo (node:sqlite) e blindar o sistema, para alcançar isolamento transacional ACID e proteção contra XSS, aceitando a exigência do Node.js v22+ no ambiente.

## Contexto e Forças

O sistema FitGesty foi concebido como um protótipo com zero dependências externas, utilizando persistência em arquivo `db.json` com `fs.writeFileSync`. A auditoria forense identificou os seguintes riscos inegociáveis:
1. Perda de dados em falhas de escrita ou falha síncrona.
2. Race condition com sobre-reserva (*double allocation*) de salas e recursos.
3. Vulnerabilidades de Stored XSS no frontend por concatenação via `.innerHTML +=`.
4. Ausência de autenticação criptográfica e autorização nas rotas da API.

## Detalhes da Implementação

1. **Persistência Relacional:** Adotar o módulo embutido `node:sqlite` do Node.js v24 (`DatabaseSync`) em modo WAL (`PRAGMA journal_mode = WAL`), criando tabelas estritas e índices B-Tree.
2. **Reserva Atômica:** Criar rota `POST /api/resources/:id/reserve` operando em transação imediata (`BEGIN IMMEDIATE`).
3. **Higienização:** Sanitizar todas as saídas no DOM com `escapeHtml`.
4. **Autenticação:** Gerar e validar tokens JWT com `node:crypto` via HMAC-SHA256 e validade de 24 horas.

## Consequências

### Positivas
- **Atomicidade e Integridade ACID:** Eliminação definitiva de corrupção de base e race conditions.
- **Soberania Zero-Dependency Mantida:** Zero pacotes instalados via npm.
- **Segurança Reforçada:** Eliminação de Stored XSS e proteção de rotas com JWT.
- **Performance Elevada:** Buscas indexadas $O(\log n)$ em vez de table scans $O(n)$ com serializações em string.

### Negativas
- Requer Node.js v22+ com suporte a `node:sqlite` nativo (o ambiente do projeto roda Node.js v24.20.0).
- Exige atualização dos scripts do frontend para passar o token `Bearer` no cabeçalho das requisições.

### Neutras/Riscos Mitigados
- Riscos de bloqueio de concorrência mitigados com o modo WAL do SQLite.
- Dados legados do `db.json` serão migrados automaticamente no primeiro arranque sem necessidade de intervenção manual.
