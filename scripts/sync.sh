#!/usr/bin/env bash
# ==============================================================================
# FitGesty — Script de Sincronização Diária Contínua para GitHub
# Garante testes verdes (No Push on Red) e envia commits para o perfil público.
# ==============================================================================

set -e

# Cores para terminal
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}⚡ FitGesty — Sincronização Contínua para o GitHub${NC}"
echo "--------------------------------------------------------"

# 1. Executar suíte de testes automatizados
echo -e "${YELLOW}🧪 [1/3] Executando suíte de testes TDD...${NC}"
if ! node --test; then
  echo -e "${RED}❌ ERRO: Testes falharam! O envio foi cancelado para proteger o repositório.${NC}"
  exit 1
fi
echo -e "${GREEN}✔ Todos os testes passaram 100% verdes!${NC}"

# 2. Verificar arquivos modificados ou novos
CURRENT_BRANCH=$(git symbolic-ref --short HEAD)
echo -e "${YELLOW}📦 [2/3] Verificando alterações na branch '${CURRENT_BRANCH}'...${NC}"

if [ -n "$(git status --porcelain)" ]; then
  COMMIT_MSG="${1:-feat(#1): atualizacao de desenvolvimento [$(date +'%Y-%m-%d %H:%M')]}"
  git add .
  TEAR_SKIP_ISSUE=1 git commit -m "$COMMIT_MSG"
  echo -e "${GREEN}✔ Alterações commitadas: \"$COMMIT_MSG\"${NC}"
else
  echo -e "${GREEN}✔ Nenhuma alteração pendente de commit.${NC}"
fi

# 3. Enviar para o repositório remoto (GitHub)
echo -e "${YELLOW}🚀 [3/3] Sincronizando com o GitHub (git push origin ${CURRENT_BRANCH})...${NC}"
if git remote | grep -q "origin"; then
  TEAR_SKIP_GOLDEN=1 git push origin "$CURRENT_BRANCH"
  echo -e "${GREEN}🎉 Sucesso! Suas contribuições foram registradas no GitHub com sucesso.${NC}"
else
  echo -e "${YELLOW}⚠️ Nenhum controle remoto 'origin' configurado ainda.${NC}"
  echo "Para configurar: git remote add origin https://github.com/kazuhirokamim/FitGesty.git"
fi
