# EcoMap Jundiaí: guia de instalação e execução

Este guia instala e executa o EcoMap no Windows, no Linux ou no macOS. **O normal é só executar dois
scripts**: o de instalação, uma vez, e o de inicialização, sempre que for usar. Eles instalam todas
as dependências do computador (inclusive o Node.js, se faltar), configuram o IP e o firewall e
conectam a conta Expo. Não é preciso editar nenhum arquivo à mão.

> ## ⚠️ O aplicativo NÃO roda no navegador
>
> O EcoMap é um aplicativo para **celular** (Android ou iPhone) e abre pelo app **Expo Go**.
> O mapa (`react-native-maps`) não funciona na web, e os pacotes do modo web não fazem parte do
> projeto.
>
> Se aparecer o erro abaixo, o app foi aberto no navegador (`npm run web` ou a tecla **w** no
> Expo):
>
> ```text
> Unable to resolve "react-native-web/dist/index" from
> "node_modules\expo-router\build\renderRootComponent.js"
> ```
>
> **Não aperte "w" e não use `npm run web`.** Escaneie o QR Code com o celular.

---

## 1. O ciclo para fazer funcionar

| # | Onde | O que fazer | Automático? |
|---|---|---|---|
| 1 | Celular | Instalar o app **Expo Go** pela Play Store ou App Store | Não (é na loja do celular) |
| 2 | Computador | Executar o instalador: `instalar-windows.bat` ou `./instalar.sh` | Sim |
| 3 | Computador | Criar a conta Expo (gratuita) e fazer `npx expo login` | O instalador abre o cadastro no navegador e executa o login; você só digita e-mail e senha |
| 4 | Computador | Executar o inicializador: `iniciar-windows.bat` ou `./iniciar.sh` | Sim: sobe a API, confere tudo e mostra o QR Code |
| 5 | Celular | Escanear o QR Code (Android: Expo Go > **Scan QR code**; iPhone: app **Câmera**) | Não |
| 6 | Celular | Usar o app. **Depois de registrar uma ocorrência, recarregar** (tecla `r` no terminal do Expo) | Não |

Os passos 2 e 3 são feitos **uma vez só**. Nas próximas vezes, basta repetir os passos 4 a 6.

Durante o passo 4, se o Expo perguntar `Port 8081 is being used by another process. Use port 8082
instead?`, **aceite** (Enter ou `Y`). Não muda nada no funcionamento.

## 2. Requisitos

**O instalador cuida destes itens sozinho:**

| Item | Como |
|---|---|
| Node.js (22.13+, 24.3+ ou 26+) | Se faltar ou for antigo, o instalador pergunta e instala a versão LTS: no Windows pelo `winget` (ou pelo instalador oficial de nodejs.org); no Linux e no macOS pelo `nvm`, na pasta do usuário, sem `sudo`. |
| Dependências da API e do app | `npm install` no backend e no mobile, e `npx expo install --fix`, que instala e alinha todos os pacotes do Expo SDK 58. A ferramenta do Expo (`npx expo`) vem dentro do projeto; não há nada para instalar globalmente. |
| Configuração | Cria `backend/.env` e `mobile/.env` com o IP do computador. |
| Firewall (Windows) | Libera as portas 3333 (API) e 8081 a 8090 (Expo) na rede privada. |
| Login no Expo | Verifica com `npx expo whoami`; se não houver login, abre o cadastro e executa `npx expo login`. |

**Você precisa providenciar:**

| Item | Detalhe |
|---|---|
| Computador | Windows 10/11, Linux (Ubuntu/Debian, Fedora, Arch) ou macOS |
| Celular | Android 7+ ou iOS 16.4+, com o app **Expo Go** atualizado pela loja (o projeto usa o **Expo SDK 58**, a mesma versão do Expo Go atual) |
| Conta Expo | Gratuita, em <https://expo.dev/signup>. O instalador abre essa página se você ainda não tiver conta. |
| Rede | Computador e celular na **mesma rede Wi-Fi** |
| Internet | Na instalação, para baixar o Node.js e as dependências |

## 3. Instalação automática

Extraia o arquivo `.zip` inteiro antes de começar (no Windows: botão direito > **Extrair tudo**).

### Windows

1. Abra a pasta extraída.
2. Clique duas vezes em **`instalar-windows.bat`**.
3. Responda às perguntas:
   - **Node.js:** se pedir para instalar, pressione **Enter** (sim).
   - **IP:** pressione **Enter** para aceitar o IP encontrado ou digite outro.
   - **Administrador:** quando o Windows pedir permissão, clique em **Sim** (instalação do Node.js
     e regra de firewall).
   - **Conta Expo:** diga se já tem conta. Se não tiver, o navegador abre na página de cadastro;
     crie a conta, volte e digite o e-mail (ou usuário) e a senha no `npx expo login`.

### Linux e macOS

No terminal, dentro da pasta extraída:

```bash
chmod +x instalar.sh && ./instalar.sh
```

Responda às mesmas perguntas (Node.js, IP e conta Expo). No Linux, se o `ufw` ou o `firewalld`
estiver ativo, o script mostra o comando para liberar as portas.

### O que o instalador faz, em ordem

1. **Node.js:** confere a versão; se faltar ou for antiga, pergunta e instala a LTS.
2. **Cópia:** copia o projeto para a pasta padrão (sem `node_modules` e sem `backend/data`). Se a
   pasta já existir, pergunta antes de sobrescrever:
   - **Windows:** `C:\EcoMap`
   - **Linux e macOS:** `~/EcoMap` (por exemplo, `/home/usuario/EcoMap` ou `/Users/usuario/EcoMap`)
3. **Backend:** `npm install` e criação do `backend/.env` a partir do `.env.example`.
4. **IP:** descobre o IPv4 do computador na rede local e pede confirmação.
5. **Mobile:** `npm install`, `npx expo install --fix` e criação do `mobile/.env` com
   `EXPO_PUBLIC_API_URL=http://<IP>:3333/api`.
6. **Firewall:** no Windows, cria a regra para as portas TCP 3333 e 8081 a 8090 na rede privada; no
   Linux, orienta sobre `ufw`/`firewalld`; no macOS, avisa sobre o pop-up "Permitir conexões de
   entrada".
7. **Conta Expo:** verifica o login (`npx expo whoami`); se não houver, abre o cadastro e executa
   `npx expo login`.

No final, mostra um resumo com a pasta, o IP, como iniciar, a conta de demonstração e a situação da
conta Expo.

## 4. Execução

### Windows

Clique duas vezes em **`C:\EcoMap\iniciar-windows.bat`**.

### Linux e macOS

```bash
cd ~/EcoMap && ./iniciar.sh
```

### O que o inicializador faz

1. Confere as dependências do app; se faltar algum pacote ou a versão do Expo SDK for outra,
   reinstala sozinho.
2. Abre a API (`npm run dev` em `backend/`) em uma janela ou terminal separado.
3. No Linux e no macOS, espera a API responder em `http://localhost:3333/api/health` e avisa quando
   ela estiver ativa. No Windows, a API fica na janela "EcoMap API".
4. Se o IP do computador mudou (outra rede Wi-Fi), oferece atualizar o `mobile/.env`.
5. Se o computador não estiver conectado à conta Expo, oferece fazer o `npx expo login`.
6. Inicia o aplicativo com `npx expo start --lan` e mostra o **QR Code**.

### Abrir o app no celular

- **Android:** abra o **Expo Go** e toque em **Scan QR code**.
- **iPhone:** aponte a **câmera** para o QR Code e toque no aviso do Expo Go.

Na primeira abertura o Expo Go leva alguns segundos para carregar o app. **Não aperte "w".**

### Avisos importantes durante o uso

- **Porta 8081 ocupada:** se o Expo mostrar `Port 8081 is being used by another process. Use port
  8082 instead?`, **aceite** (Enter ou `Y`). O QR Code passa a usar a porta nova, e o firewall já
  libera de 8081 a 8090.
- **Recarregar depois de registrar uma ocorrência:** o mapa busca os dados quando o app abre. Depois
  de publicar uma ocorrência, recarregue o app para vê-la no mapa:
  - pressione **`r`** na janela do Expo (onde aparece o QR Code); ou
  - agite o celular e toque em **Reload** no menu do Expo Go.

  Na aba **Ocorrências**, também dá para arrastar a lista para baixo para atualizar.
- **Encerrar:** pressione `Ctrl+C` na janela do Expo e feche a janela da API.

### Conta de demonstração

| E-mail | Senha |
|---|---|
| `demo@ecomap.local` | `123456` |

Também é possível criar uma conta pela tela de cadastro do app. Para testar a confirmação comunitária
(3 confirmações mudam o status para "Confirmada"), use três contas diferentes.

> A conta de demonstração é do **EcoMap**. A **conta Expo** é outra coisa: é a do serviço Expo, usada
> no computador pelo `npx expo login`.

## 5. Atualizar para uma versão nova do projeto

Os inicializadores sempre rodam a cópia instalada (`C:\EcoMap` ou `~/EcoMap`). Ao receber um `.zip`
novo, extraia-o e execute o instalador de novo de dentro da pasta extraída, respondendo **S** quando
ele perguntar se quer sobrescrever. O `backend/.env` e o login no Expo são mantidos, e o IP é
confirmado de novo.

## 6. Instalação manual (só se o instalador falhar)

### 6.1 Dependências do computador

**Node.js (22.13+, 24.3+ ou 26+):**

| Sistema | Como instalar |
|---|---|
| Windows | `winget install -e --id OpenJS.NodeJS.LTS` no PowerShell, ou o instalador "LTS" de <https://nodejs.org>. Depois, feche e abra o terminal. |
| Linux e macOS (recomendado) | nvm, sem `sudo`: `curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh \| bash`, feche e abra o terminal e execute `nvm install --lts` |
| macOS (alternativa) | Homebrew: `brew install node` |

Confira com `node -v` e `npm -v`.

**No celular:** instale o **Expo Go** pela Play Store ou App Store.

**Conta Expo:** crie em <https://expo.dev/signup>.

### 6.2 Comandos do projeto

Troque `192.168.0.25` pelo IPv4 do computador.

#### Windows (PowerShell)

```powershell
# 1. Copiar o projeto (execute dentro da pasta extraída)
robocopy . C:\EcoMap /E /XD node_modules .expo data

# 2. Backend
cd C:\EcoMap\backend
npm install
copy .env.example .env

# 3. Descobrir o IPv4 (use o do adaptador Wi-Fi ou Ethernet)
ipconfig

# 4. Mobile: dependências, pacotes do Expo e endereço da API
cd C:\EcoMap\mobile
npm install
npx expo install --fix
Set-Content .env "EXPO_PUBLIC_API_URL=http://192.168.0.25:3333/api" -Encoding ascii

# 5. Firewall (PowerShell como Administrador)
New-NetFirewallRule -DisplayName "EcoMap" -Direction Inbound -Protocol TCP -LocalPort 3333,'8081-8090' -Action Allow -Profile Private

# 6. Conta Expo (uma vez)
npx expo login

# Executar: um terminal para a API...
cd C:\EcoMap\backend
npm run dev
# ...e outro para o app (se perguntar sobre a porta 8081, aceite)
cd C:\EcoMap\mobile
npx expo start --lan
```

#### Linux e macOS

```bash
# 1. Copiar o projeto (execute dentro da pasta extraída)
mkdir -p ~/EcoMap
tar --exclude=node_modules --exclude=.expo --exclude=./backend/data -cf - . | tar -C ~/EcoMap -xf -

# 2. Backend
cd ~/EcoMap/backend
npm install
cp .env.example .env

# 3. Descobrir o IPv4
hostname -I                                         # Linux
ipconfig getifaddr en0 || ipconfig getifaddr en1    # macOS

# 4. Mobile: dependências, pacotes do Expo e endereço da API
cd ~/EcoMap/mobile
npm install
npx expo install --fix
echo "EXPO_PUBLIC_API_URL=http://192.168.0.25:3333/api" > .env

# 5. Firewall (se estiver ativo)
sudo ufw allow 3333/tcp && sudo ufw allow 8081:8090/tcp                                       # ufw
sudo firewall-cmd --permanent --add-port=3333/tcp --add-port=8081-8090/tcp && sudo firewall-cmd --reload  # Fedora

# 6. Conta Expo (uma vez)
npx expo login

# Executar: um terminal para a API...
cd ~/EcoMap/backend && npm run dev
# ...e outro para o app (se perguntar sobre a porta 8081, aceite)
cd ~/EcoMap/mobile && npx expo start --lan
```

Para conferir a API, abra `http://localhost:3333/api/health` no navegador do computador. A resposta
deve conter `"status":"ok"`.

## 7. Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| O QR Code abre, mas o app não carrega dados, ou aparece o alerta "Conexão" | O IP no `mobile/.env` está errado ou a porta 3333 está bloqueada | No **navegador do celular**, abra `http://IP_DO_COMPUTADOR:3333/api/health`. Se não abrir, confira o IP (execute o script de inicialização de novo; ele detecta a mudança de IP) e o firewall. |
| "Network request failed" | Mesmo caso anterior | Confira o firewall e se os dois aparelhos estão na mesma rede Wi-Fi. No Windows, a rede precisa estar como **Privada** (Configurações > Rede e Internet > sua rede > Perfil de rede). |
| Erro `Unable to resolve "react-native-web/dist/index"` | O app foi aberto no navegador | Não use `npm run web` nem a tecla **w**. Abra pelo Expo Go no celular. |
| `Unable to resolve module expo-linking` (ou `expo-constants`) | Dependência do Expo Router faltando, por instalação antiga ou feita com `--legacy-peer-deps` | Na pasta `mobile`: `npx expo install expo-linking expo-constants` e depois `npx expo start --lan --clear`. |
| "Project is incompatible with this version of Expo Go" | O Expo Go e o projeto estão em versões diferentes do Expo SDK | O projeto usa o SDK 58. Atualize o Expo Go pela Play Store ou App Store. Se a mensagem disser que o *projeto* usa um SDK mais antigo, as dependências do computador estão desatualizadas: execute o script de inicialização (ele reinstala sozinho) ou `npx expo install --fix` na pasta `mobile`. |
| A API não inicia e mostra erro com `node:sqlite`, ou o Expo reclama da versão do Node | Versão do Node.js antiga | Instale a versão LTS em <https://nodejs.org> e execute a instalação de novo. |
| O QR Code não conecta na rede da faculdade | A rede bloqueia a comunicação entre aparelhos (isolamento de clientes) | Use o **roteador do celular (hotspot)** e conecte o computador nele; depois execute o script de inicialização (ele oferece atualizar o IP). Outra opção para o QR Code é `npx expo start --tunnel`, mas a **API continua precisando ser acessível pela rede** (porta 3333). |
| O Expo pergunta `Port 8081 is being used by another process. Use port 8082 instead?` | Outro programa (ou outra janela do Expo) já usa a porta 8081 | **Aceite**: pressione Enter ou `Y`. O app funciona normalmente na porta nova; o firewall já libera de 8081 a 8090. |
| A ocorrência registrada não aparece no mapa | O mapa carrega os dados só quando o app abre | Recarregue o app: tecla **`r`** na janela do Expo, ou agite o celular e toque em **Reload**. Na aba **Ocorrências**, basta arrastar a lista para baixo. |
| `npx expo login` pede conta ou falha | Ainda não existe conta Expo, ou e-mail/senha incorretos | Crie a conta gratuita em <https://expo.dev/signup> e execute `npx expo login` na pasta `mobile`. Para conferir: `npx expo whoami`. |
| O Node.js foi instalado, mas o terminal diz `node: command not found` (Linux/macOS) | O nvm instala o Node.js para o usuário, e o terminal antigo não sabe disso | Feche e abra o terminal, ou use sempre o `./iniciar.sh`, que carrega o nvm sozinho. |
| O Windows mostra "Permitir que o Node.js se comunique" | Primeira execução do Node.js | Marque **Redes privadas** e clique em **Permitir**. |
| O script do Windows fecha sem mensagem | O `.zip` não foi extraído | Extraia o arquivo inteiro (botão direito > Extrair tudo) e execute o `.bat` dentro da pasta extraída. |

## 8. Opcional: APK para Android (sem Expo Go)

Um **APK** gerado com o EAS Build (`eas build -p android --profile preview`) permitiria instalar o
app direto no Android, sem o Expo Go. **Esse caminho não faz parte desta entrega**, porque exige
duas mudanças de configuração que esta versão não tem:

1. **HTTP sem criptografia:** a API usa `http://`, e o Android bloqueia esse tráfego em builds de
   release. Seria preciso habilitar `usesCleartextTraffic` no `app.json` (com o plugin
   `expo-build-properties`), o que altera a configuração do app.
2. **Endereço da API:** o `mobile/.env` não é enviado ao EAS (ele está no `.gitignore`). O
   `EXPO_PUBLIC_API_URL` teria de ser definido no campo `env` do perfil `preview` do `eas.json`.

Mesmo com esses ajustes, o endereço da API fica **gravado no APK no momento do build**: o APK só
funciona com o computador da API naquele mesmo IP, e qualquer mudança de IP exige um novo build.
Por isso o caminho recomendado é o Expo Go.

## 9. Estrutura instalada

```text
EcoMap/                    (C:\EcoMap no Windows, ~/EcoMap no Linux e macOS)
├── INSTALACAO.md          este guia
├── instalar-windows.bat   instalação no Windows (chama instalar-windows.ps1)
├── iniciar-windows.bat    execução no Windows (chama iniciar-windows.ps1)
├── instalar.sh            instalação no Linux e macOS
├── iniciar.sh             execução no Linux e macOS
├── backend/               API REST (Node.js + Express + SQLite)
│   ├── .env               PORT=3333 e JWT_SECRET
│   ├── data/ecomap.db     banco criado na primeira execução da API
│   └── uploads/           imagens das ocorrências
└── mobile/                aplicativo (Expo + React Native)
    └── .env               EXPO_PUBLIC_API_URL=http://<IP>:3333/api
```
