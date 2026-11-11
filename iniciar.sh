#!/usr/bin/env bash
# ===========================================================================
# EcoMap Jundiaí - inicialização no Linux e macOS (depois de ./instalar.sh)
# Abre a API em um terminal separado, confere se ela responde e inicia o Expo
# para abrir o app no celular pelo Expo Go.
# ===========================================================================
set -uo pipefail

PORTA_API=3333
URL_SAUDE="http://localhost:$PORTA_API/api/health"
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
# Usa o fetch do próprio Node, para não depender de curl/wget.
api_ativa() {
  node -e "fetch('$URL_SAUDE').then(r=>r.json()).then(j=>process.exit(j.status==='ok'?0:1)).catch(()=>process.exit(1))" 2>/dev/null
}

# Usa ~/EcoMap quando a instalação foi feita lá; senão, a pasta deste script.
# Se o Node.js foi instalado pelo nvm (instalar.sh), carrega-o nesta sessão.
if [[ -s "$HOME/.nvm/nvm.sh" ]] && ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  set +u
  . "$NVM_DIR/nvm.sh"
  set -u
fi
command -v node >/dev/null 2>&1 || falha "Node.js não encontrado. Execute ./instalar.sh primeiro."

RAIZ="$HOME/EcoMap"
[[ -d "$RAIZ/backend/node_modules" ]] || RAIZ="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$RAIZ/backend"
MOBILE="$RAIZ/mobile"
[[ -d "$BACKEND/node_modules" && -d "$MOBILE/node_modules" ]] ||
  falha "O projeto ainda não foi instalado. Execute ./instalar.sh primeiro."

# Confere se as dependências instaladas batem com o mobile/package.json: SDK do
# Expo diferente (instalação antiga) ou pacote ausente (por exemplo, um
# expo-linking que faltou) fazem o Expo Go falhar. Nesses casos reinstala as
# dependências e inicia o Expo com --clear, para o Metro descartar o cache antigo.
LIMPAR_CACHE=""
PROBLEMA_DEPS="$(node -e "
const fs = require('fs'), path = require('path');
const dir = process.argv[1];
const pkg = require(path.join(dir, 'package.json'));
const faltando = Object.keys(pkg.dependencies).filter((d) => !fs.existsSync(path.join(dir, 'node_modules', d, 'package.json')));
if (faltando.length) { console.log('pacotes ausentes: ' + faltando.join(', ')); process.exit(); }
const esperado = pkg.dependencies.expo.replace(/[^0-9.]/g, '').split('.')[0];
const instalado = require(path.join(dir, 'node_modules', 'expo', 'package.json')).version.split('.')[0];
if (esperado !== instalado) console.log('Expo SDK ' + instalado + ' instalado, projeto usa SDK ' + esperado);
" "$MOBILE" 2>/dev/null)"
if [[ -n "$PROBLEMA_DEPS" ]]; then
  aviso "Dependências do app desatualizadas ($PROBLEMA_DEPS). Atualizando..."
  (cd "$MOBILE" && { npm install --no-audit --no-fund || npm install --no-audit --no-fund --legacy-peer-deps; } &&
    { npx expo install --fix || npx expo install --fix -- --legacy-peer-deps; }) ||
    falha "Não foi possível atualizar as dependências. Execute ./instalar.sh novamente."
  ok "Dependências atualizadas"
  LIMPAR_CACHE="--clear"
fi

echo
verde '#############################################################'
verde '#              EcoMap Jundiaí - Iniciando                   #'
verde '#############################################################'
echo "  Pasta: $RAIZ"

# ---------------------------------------------------------------------------
# 1. API em um terminal separado (npm run dev em backend/)
# ---------------------------------------------------------------------------
ciano '1/3 Iniciando a API'
# Carrega o backend/.env (PORT, JWT_SECRET) antes de "npm run dev", pois o
# server.js lê process.env.
CMD_API="if [ -s \"\$HOME/.nvm/nvm.sh\" ]; then . \"\$HOME/.nvm/nvm.sh\"; fi; cd '$BACKEND' && if [ -f .env ]; then set -a; . ./.env; set +a; fi; npm run dev"
LOG_API="$RAIZ/backend/api.log"
PID_API=""
if api_ativa; then
  ok "A API já estava em execução em $URL_SAUDE"
else
  ABERTA=1
  if [[ "$SISTEMA" == "Darwin" ]]; then
    # O comando vai dentro de uma string do AppleScript: escapa \ e ".
    CMD_OSA="${CMD_API//\\/\\\\}"
    CMD_OSA="${CMD_OSA//\"/\\\"}"
    osascript -e "tell application \"Terminal\" to do script \"$CMD_OSA\"" >/dev/null || ABERTA=0
  elif [[ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]] && command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal --title="EcoMap API" -- bash -c "$CMD_API; exec bash" || ABERTA=0
  elif [[ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]] && command -v konsole >/dev/null 2>&1; then
    konsole -e bash -c "$CMD_API; exec bash" >/dev/null 2>&1 &
  elif [[ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]] && command -v x-terminal-emulator >/dev/null 2>&1; then
    x-terminal-emulator -e bash -c "$CMD_API; exec bash" >/dev/null 2>&1 &
  elif [[ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]] && command -v xterm >/dev/null 2>&1; then
    xterm -T "EcoMap API" -e bash -c "$CMD_API; exec bash" >/dev/null 2>&1 &
  else
    ABERTA=0
  fi
  if ((ABERTA)); then
    ok "API aberta em um terminal separado (feche-o para parar a API)."
  else
    # Sem interface gráfica: a API roda em segundo plano, com saída no
    # api.log, e é encerrada junto com este script.
    # set -m coloca a API em um grupo de processos próprio, para que o kill
    # do grupo encerre também o npm e o node iniciados por ela.
    set -m
    bash -c "$CMD_API" >"$LOG_API" 2>&1 &
    PID_API=$!
    set +m
    trap '[[ -n "$PID_API" ]] && kill -- -"$PID_API" 2>/dev/null' EXIT
    ok "API iniciada em segundo plano (saída em $LOG_API)."
  fi

  # -------------------------------------------------------------------------
  # 2. Espera a API responder em /api/health
  # -------------------------------------------------------------------------
  ciano '2/3 Aguardando a API responder'
  ATIVA=0
  for _ in $(seq 1 30); do
    sleep 1
    if api_ativa; then ATIVA=1; break; fi
  done
  if ((ATIVA)); then
    ok "API ativa: $URL_SAUDE respondeu \"status\":\"ok\""
  else
    aviso "A API não respondeu em 30 segundos. Veja o terminal da API (ou $LOG_API)."
    aviso "Se aparecer erro com node:sqlite, atualize o Node.js para a versão LTS (https://nodejs.org)."
  fi
fi

# ---------------------------------------------------------------------------
# Confere se o IP do mobile/.env ainda pertence a este computador (o IP pode
# mudar ao trocar de rede Wi-Fi) e oferece a atualização automática.
# ---------------------------------------------------------------------------
IP_CONF="$(sed -n 's#.*EXPO_PUBLIC_API_URL=https\{0,1\}://\([^:/]*\).*#\1#p' "$MOBILE/.env" 2>/dev/null | head -n1)"
if [[ "$SISTEMA" == "Darwin" ]]; then
  IPS_ATUAIS="$(ifconfig 2>/dev/null | awk '/inet /{print $2}')"
  IP_NOVO="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
else
  IPS_ATUAIS="$(hostname -I 2>/dev/null | tr ' ' '\n'; ip -4 -o addr show 2>/dev/null | awk '{split($4,a,"/"); print a[1]}')"
  IP_NOVO="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -Ev '^(127\.|169\.254\.|172\.17\.)' | grep -E '^[0-9.]+$' | head -n1)"
  [[ -n "$IP_NOVO" ]] || IP_NOVO="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") print $(i+1)}' | head -n1)"
fi
if [[ -n "$IP_NOVO" ]] && { [[ -z "$IP_CONF" ]] || ! grep -qxF "$IP_CONF" <<<"$IPS_ATUAIS"; }; then
  echo
  aviso "O mobile/.env aponta para '$IP_CONF', que não é um IP deste computador agora."
  read -r -p "  Atualizar para $IP_NOVO? (s/N) " RESP
  if [[ "$RESP" =~ ^[sS] ]]; then
    printf 'EXPO_PUBLIC_API_URL=http://%s:%s/api\n' "$IP_NOVO" "$PORTA_API" >"$MOBILE/.env"
    IP_CONF="$IP_NOVO"
    ok "mobile/.env atualizado para http://$IP_NOVO:$PORTA_API/api"
  fi
fi

# ---------------------------------------------------------------------------
# 3. Expo em modo LAN (QR Code para o Expo Go)
# ---------------------------------------------------------------------------
# Conta Expo: lembra de fazer o login, se ainda não foi feito.
if ! (cd "$MOBILE" && npx expo whoami >/dev/null 2>&1); then
  echo
  aviso "Este computador não está conectado a uma conta Expo (crie em https://expo.dev/signup)."
  read -r -p "  Fazer login agora com \"npx expo login\"? (S/n) " RESP
  if [[ ! "$RESP" =~ ^[nN] ]]; then
    (cd "$MOBILE" && npx expo login) || aviso "Login não concluído. Execute depois: npx expo login"
  fi
fi

ciano '3/3 Iniciando o aplicativo (Expo)'
echo
amarelo '  >>> Abra no CELULAR pelo app Expo Go:'
amarelo '      Android: Expo Go > "Scan QR code"   |   iPhone: app Câmera'
amarelo '  >>> NÃO aperte "w" e NÃO use o navegador: o app não roda na web.'
amarelo "  >>> Celular e computador na mesma rede Wi-Fi. API: http://$IP_CONF:$PORTA_API/api"
amarelo '  >>> Se aparecer "Port 8081 is being used... Use port 8082 instead?", aceite (Enter ou Y).'
amarelo '  >>> Depois de registrar uma ocorrência, recarregue o app: tecla "r" aqui no terminal'
amarelo '      (ou agite o celular e toque em "Reload"). Na aba Ocorrências, arraste a lista para baixo.'
echo '  Para encerrar: Ctrl+C aqui (e feche o terminal da API, se ele foi aberto).'
echo

# Faz o Expo anunciar o mesmo IP usado pela API (evita escolher uma interface
# virtual, como a do Docker, quando o computador tem várias).
[[ -n "$IP_CONF" ]] && export REACT_NATIVE_PACKAGER_HOSTNAME="$IP_CONF"
cd "$MOBILE" && npx expo start --lan $LIMPAR_CACHE
