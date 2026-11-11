#!/usr/bin/env bash
# ===========================================================================
# EcoMap Jundiaí - instalação no Linux (Ubuntu/Debian, Fedora, Arch) e macOS
# Uso: chmod +x instalar.sh && ./instalar.sh
# Não altera o código do sistema: instala o Node.js (se faltar), copia o
# projeto para ~/EcoMap, instala as dependências, cria os arquivos .env,
# orienta sobre o firewall e conecta a conta Expo.
# ===========================================================================
set -euo pipefail

DESTINO="$HOME/EcoMap"
ORIGEM="$(cd "$(dirname "$0")" && pwd)"
PORTA_API=3333
PORTAS_EXPO="8081:8090"
NVM_VERSAO="v0.40.3"
SISTEMA="$(uname -s)"

verde() { printf '\033[32m%s\033[0m\n' "$*"; }
amarelo() { printf '\033[33m%s\033[0m\n' "$*"; }
ciano() { printf '\n\033[36m=== %s ===\033[0m\n' "$*"; }
ok() { verde "  [OK] $*"; }
aviso() { amarelo "  [!]  $*"; }
falha() {
  printf '\n\033[31m  [ERRO] %s\033[0m\n\n' "$*"
  exit 1
}
ipv4_valido() {
  [[ "$1" =~ ^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$ ]] || return 1
  for parte in "${BASH_REMATCH[@]:1}"; do ((parte <= 255)) || return 1; done
}

# O backend usa o módulo nativo node:sqlite (22.13+) e o Expo SDK 58 exige
# 22.13+ na linha 22, 24.3+ na linha 24 ou 26+.
node_compativel() {
  command -v node >/dev/null 2>&1 &&
    node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit((a===22&&b>=13)||(a===24&&b>=3)||a>=26?0:1)"
}
# Carrega o nvm, se já estiver instalado. O nvm não funciona com "set -eu",
# por isso essas opções ficam desligadas enquanto ele roda.
carregar_nvm() {
  export NVM_DIR="$HOME/.nvm"
  [[ -s "$NVM_DIR/nvm.sh" ]] || return 1
  set +eu
  . "$NVM_DIR/nvm.sh"
  set -eu
}
# curl é necessário para baixar o nvm; quase sempre já vem instalado.
instalar_curl() {
  if command -v apt-get >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y curl
  elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y curl
  elif command -v pacman >/dev/null 2>&1; then sudo pacman -Sy --noconfirm curl
  elif command -v zypper >/dev/null 2>&1; then sudo zypper install -y curl
  else return 1
  fi
}
# Instala o Node.js LTS com o nvm, na pasta do usuário (~/.nvm), sem sudo e
# sem mexer no Node.js do sistema. Funciona igual no Linux e no macOS.
instalar_node() {
  command -v curl >/dev/null 2>&1 || instalar_curl || return 1
  if [[ ! -s "$HOME/.nvm/nvm.sh" ]]; then
    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSAO/install.sh" | bash || return 1
  fi
  carregar_nvm || return 1
  set +eu
  nvm install --lts && nvm alias default 'lts/*' >/dev/null && nvm use default >/dev/null
  local codigo=$?
  set -eu
  return $codigo
}
# Abre um endereço no navegador padrão (Linux ou macOS).
abrir_navegador() {
  if [[ "$SISTEMA" == "Darwin" ]]; then open "$1" >/dev/null 2>&1 || true
  else xdg-open "$1" >/dev/null 2>&1 || true
  fi
}

echo
verde '#############################################################'
verde '#         EcoMap Jundiaí - Instalação (Linux/macOS)         #'
verde '#############################################################'

# ---------------------------------------------------------------------------
# 1. Node.js: se faltar ou for antigo, oferece instalar a versão LTS
# ---------------------------------------------------------------------------
ciano '1/7 Verificando o Node.js'
node_compativel || carregar_nvm || true
if ! node_compativel; then
  if command -v node >/dev/null 2>&1; then
    aviso "Node.js $(node -v) não é compatível (precisa de 22.13+, 24.3+ ou 26+)."
  else
    aviso "Node.js não encontrado."
  fi
  read -r -p "  Instalar o Node.js LTS automaticamente agora (via nvm, sem sudo)? (S/n) " RESP
  [[ "$RESP" =~ ^[nN] ]] &&
    falha "Instale o Node.js LTS em https://nodejs.org e execute ./instalar.sh novamente."
  instalar_node && node_compativel ||
    falha "Não foi possível instalar o Node.js automaticamente. Instale a versão LTS em https://nodejs.org e execute ./instalar.sh novamente."
fi
VERSAO_NODE="$(node -p 'process.versions.node')"
command -v npm >/dev/null 2>&1 || falha "npm não encontrado. Reinstale o Node.js pela versão LTS em https://nodejs.org."
ok "Node.js $VERSAO_NODE"

# ---------------------------------------------------------------------------
# 2. Cópia do projeto para ~/EcoMap (sem node_modules e sem backend/data)
# ---------------------------------------------------------------------------
ciano "2/7 Copiando o projeto para $DESTINO"
[[ -f "$ORIGEM/backend/src/server.js" ]] ||
  falha "Execute este script de dentro da pasta extraída do projeto EcoMap (onde estão backend e mobile)."

MESMO_LOCAL=0
if [[ -d "$DESTINO" ]] && [[ "$(cd "$DESTINO" && pwd -P)" == "$(cd "$ORIGEM" && pwd -P)" ]]; then
  MESMO_LOCAL=1
fi
if ((MESMO_LOCAL)); then
  ok "O projeto já está em $DESTINO. Nada a copiar."
else
  COPIAR=1
  if [[ -d "$DESTINO" ]]; then
    aviso "A pasta $DESTINO já existe."
    read -r -p "  Sobrescrever os arquivos do projeto com esta versão? (s/N) " RESP
    if [[ ! "$RESP" =~ ^[sS] ]]; then
      COPIAR=0
      aviso "Mantida a versão que já está em $DESTINO. A instalação continua com ela."
    fi
  fi
  if ((COPIAR)); then
    mkdir -p "$DESTINO"
    # tar funciona igual no Linux e no macOS; node_modules, .expo e o banco
    # (backend/data, recriado pela API) ficam de fora.
    tar -C "$ORIGEM" --exclude='node_modules' --exclude='.expo' --exclude='.git' \
      --exclude='./backend/data' -cf - . | tar -C "$DESTINO" -xf -
    ok "Projeto copiado para $DESTINO"
  fi
fi
chmod +x "$DESTINO/instalar.sh" "$DESTINO/iniciar.sh" 2>/dev/null || true
BACKEND="$DESTINO/backend"
MOBILE="$DESTINO/mobile"

# ---------------------------------------------------------------------------
# 3. Backend: dependências e backend/.env
# ---------------------------------------------------------------------------
ciano '3/7 Instalando o backend (API)'
(cd "$BACKEND" && npm install --no-audit --no-fund) ||
  falha "npm install falhou no backend. Verifique a conexão com a internet e tente de novo."
if [[ ! -f "$BACKEND/.env" ]]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  ok "backend/.env criado a partir do .env.example"
else
  ok "backend/.env já existia e foi mantido"
fi

# ---------------------------------------------------------------------------
# 4. IPv4 do computador na rede local (o celular acessa a API por ele)
# ---------------------------------------------------------------------------
ciano '4/7 Descobrindo o IP do computador na rede local'
IP_SUGERIDO=""
if [[ "$SISTEMA" == "Darwin" ]]; then
  IP_SUGERIDO="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
else
  IP_SUGERIDO="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -Ev '^(127\.|169\.254\.|172\.17\.)' | grep -E '^[0-9.]+$' | head -n1 || true)"
  if [[ -z "$IP_SUGERIDO" ]] && command -v ip >/dev/null 2>&1; then
    # Alternativa para distribuições em que "hostname -I" não existe (ex.: Arch).
    IP_SUGERIDO="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") print $(i+1)}' | head -n1 || true)"
  fi
fi
while true; do
  if [[ -n "$IP_SUGERIDO" ]]; then
    read -r -p "  IP encontrado: $IP_SUGERIDO. [Enter] para usar ou digite outro: " RESP
    IP="${RESP:-$IP_SUGERIDO}"
  else
    read -r -p "  Não foi possível detectar o IP. Digite o IPv4 deste computador: " IP
  fi
  IP="${IP//[[:space:]]/}"
  if ipv4_valido "$IP"; then break; fi
  aviso "'$IP' não é um IPv4 válido (exemplo: 192.168.0.25)."
done
ok "IP configurado: $IP"

# ---------------------------------------------------------------------------
# 5. Mobile: dependências e mobile/.env com o endereço da API
# ---------------------------------------------------------------------------
ciano '5/7 Instalando o aplicativo (mobile)'
if ! (cd "$MOBILE" && npm install --no-audit --no-fund); then
  aviso "npm install falhou; tentando novamente com --legacy-peer-deps..."
  (cd "$MOBILE" && npm install --no-audit --no-fund --legacy-peer-deps) ||
    falha "npm install falhou no mobile. Verifique a conexão com a internet e tente de novo."
fi
# Alinha cada dependência à versão exata que o Expo SDK 58 (o mesmo do Expo Go
# atual da loja) espera. Sem isso, o Expo Go pode recusar o projeto.
echo "  Instalando e alinhando os pacotes do Expo SDK 58 (npx expo install --fix)..."
if (cd "$MOBILE" && { npx expo install --fix || npx expo install --fix -- --legacy-peer-deps; }); then
  ok "Dependências alinhadas com o Expo SDK 58"
else
  aviso "Não foi possível alinhar as versões automaticamente. Execute \"npx expo install --fix\" na pasta mobile."
fi
printf 'EXPO_PUBLIC_API_URL=http://%s:%s/api\n' "$IP" "$PORTA_API" >"$MOBILE/.env"
ok "mobile/.env criado: EXPO_PUBLIC_API_URL=http://$IP:$PORTA_API/api"

# ---------------------------------------------------------------------------
# 6. Firewall (só orientação: nenhuma regra é alterada sem o usuário)
# ---------------------------------------------------------------------------
ciano '6/7 Firewall'
if [[ "$SISTEMA" == "Darwin" ]]; then
  aviso "No macOS, ao iniciar a API pode aparecer o aviso \"Permitir conexões de entrada\" para o node."
  echo "       Clique em Permitir; sem isso o celular não acessa a API."
else
  FIREWALL=0
  if command -v ufw >/dev/null 2>&1 && systemctl is-active --quiet ufw 2>/dev/null; then
    FIREWALL=1
    aviso "ufw ativo. Libere as portas da API e do Expo com:"
    echo "       sudo ufw allow $PORTA_API/tcp && sudo ufw allow $PORTAS_EXPO/tcp"
  fi
  if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld 2>/dev/null; then
    FIREWALL=1
    aviso "firewalld ativo (padrão no Fedora). Libere as portas com:"
    echo "       sudo firewall-cmd --permanent --add-port=$PORTA_API/tcp --add-port=${PORTAS_EXPO/:/-}/tcp && sudo firewall-cmd --reload"
  fi
  ((FIREWALL)) || ok "Nenhum firewall ativo detectado (ufw/firewalld)."
fi

# ---------------------------------------------------------------------------
# 7. Conta Expo: verifica o login (npx expo whoami) e, se preciso, abre o
#    cadastro no navegador e executa "npx expo login"
# ---------------------------------------------------------------------------
ciano '7/7 Conta Expo'
LOGADO_EXPO=0
if USUARIO_EXPO="$(cd "$MOBILE" && npx expo whoami 2>/dev/null)" && [[ -n "$USUARIO_EXPO" ]]; then
  LOGADO_EXPO=1
  ok "Conectado à conta Expo: $(printf '%s\n' "$USUARIO_EXPO" | grep -v '^[[:space:]]*$' | tail -n1)"
else
  aviso "Este computador ainda não está conectado a uma conta Expo."
  echo "       O login é feito uma vez só, com \"npx expo login\". A conta é gratuita."
  read -r -p "  Você já tem conta no Expo? (s/N) " RESP
  if [[ ! "$RESP" =~ ^[sS] ]]; then
    echo "  Abrindo https://expo.dev/signup no navegador. Crie a conta e volte aqui."
    abrir_navegador "https://expo.dev/signup"
    read -r -p "  Pressione Enter depois de criar a conta " _
  fi
  echo "  Executando \"npx expo login\" (informe o e-mail ou usuário e a senha da conta Expo):"
  if (cd "$MOBILE" && npx expo login); then
    LOGADO_EXPO=1
    ok "Login no Expo concluído"
  else
    aviso "O login não foi concluído. Depois, na pasta mobile, execute: npx expo login"
  fi
fi

# ---------------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------------
echo
verde '#############################################################'
verde '#                  Instalação concluída                     #'
verde '#############################################################'
echo
echo "  Pasta do projeto : $DESTINO"
echo "  IP configurado   : $IP  (API em http://$IP:$PORTA_API/api)"
echo "  Para iniciar     : cd \"$DESTINO\" && ./iniciar.sh"
echo "  Conta de demonstração: demo@ecomap.local / 123456"
if ((LOGADO_EXPO)); then echo "  Conta Expo       : conectada"; else echo "  Conta Expo       : PENDENTE (execute \"npx expo login\" na pasta mobile)"; fi
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then echo "  Node.js          : instalado pelo nvm em ~/.nvm (o iniciar.sh já o carrega)"; fi
echo
amarelo '  IMPORTANTE:'
amarelo '  - Instale o app Expo Go no celular (Play Store ou App Store).'
amarelo '  - O aplicativo abre no CELULAR, pelo Expo Go. Não aperte "w" e não use o navegador.'
amarelo '  - Se o Expo disser que a porta 8081 está em uso e oferecer outra, aceite (Enter ou Y).'
amarelo '  - Depois de registrar uma ocorrência, recarregue o app: tecla "r" no terminal do Expo.'
echo
