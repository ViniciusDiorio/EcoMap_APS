# EcoMap Jundiaí — APS

> **Para instalar e executar, siga o [INSTALACAO.md](INSTALACAO.md).** Em resumo:
>
> 1. Instale o app **Expo Go** no celular (Play Store ou App Store).
> 2. No computador, execute `instalar-windows.bat` (Windows) ou `./instalar.sh` (Linux/macOS). Ele
>    instala tudo o que falta, inclusive o Node.js, e conecta a conta Expo (`npx expo login`; a conta
>    é gratuita em <https://expo.dev/signup>).
> 3. Execute `iniciar-windows.bat` ou `./iniciar.sh` e escaneie o QR Code com o celular.
>
> **Avisos:**
>
> - O aplicativo abre no **celular pelo Expo Go**; ele não roda no navegador.
> - Se o Expo disser que a **porta 8081 está em uso** e oferecer outra (`Use port 8082 instead?`),
>   **aceite** com Enter ou `Y`.
> - **Depois de registrar uma ocorrência, recarregue o app** no Expo Go (tecla `r` no terminal do
>   Expo, ou agite o celular e toque em **Reload**) para vê-la no mapa.

Aplicação móvel colaborativa para localização de pontos adequados de descarte e registro de ocorrências ambientais urbanas em Jundiaí.

## Arquitetura

- `mobile/`: aplicativo Android/iOS desenvolvido com Expo + React Native + TypeScript.
- `backend/`: API REST em Node.js + Express.
- `backend/data/`: banco SQLite criado automaticamente pelo backend.
- `backend/uploads/`: imagens enviadas nas ocorrências.

Fluxo: **celular (cliente móvel) → HTTP/JSON → servidor (API) → SQLite/arquivos**.

O projeto foi pensado para ser executado integralmente em um computador que atua como servidor e testado fisicamente em um celular.

## Requisitos

- Windows 10/11, Linux (Ubuntu/Debian, Fedora, Arch) ou macOS
- Node.js 22.13+ (linha 22), 24.3+ (linha 24) ou 26+
- npm 10+
- Expo Go instalado no celular para o primeiro ciclo de testes
- Servidor e celular na mesma rede local para o modo LAN

O aplicativo usa Expo SDK 58 (React Native 0.88), a versão suportada pelo Expo Go atual da App Store e do Google Play.

## 1. Backend

Abra um PowerShell (Windows) ou um terminal (Linux/macOS):

```powershell
cd C:\EcoMap\backend        # Linux/macOS: cd ~/EcoMap/backend
npm install
npm run dev
```

Se o projeto estiver em outro diretório, use o caminho correspondente.

O servidor ficará em `http://0.0.0.0:3333`.

Teste no servidor:

```powershell
curl http://localhost:3333/api/health
```

A resposta esperada contém `"status":"ok"`.

## 2. Descobrir o IP do servidor

```powershell
ipconfig                                          # Windows (PowerShell)
hostname -I                                       # Linux
ipconfig getifaddr en0 || ipconfig getifaddr en1  # macOS
```

Use o IPv4 do adaptador conectado à mesma rede do celular. Exemplo:

```text
192.168.0.25
```

## 3. Configurar o aplicativo

Crie `mobile/.env` a partir de `mobile/.env.example`:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.25:3333/api
```

Troque `192.168.0.25` pelo IPv4 real do servidor.

## 4. Instalar o mobile

```powershell
cd C:\EcoMap\mobile         # Linux/macOS: cd ~/EcoMap/mobile
npm install
```

Depois:

```powershell
npx expo start --lan
```

Escaneie o QR Code pelo Expo Go no celular.

### Se o QR Code não funcionar

O QR Code do Expo e a API são duas conexões diferentes. Para a API, o celular precisa conseguir acessar o IPv4 do servidor na porta `3333`.

No Windows Firewall, permita o Node.js em **Redes privadas** ou crie uma regra para a porta TCP 3333. No Linux, libere a porta 3333 no `ufw` ou no `firewalld`; no macOS, clique em **Permitir** no aviso de conexões de entrada para o `node`.

Teste no navegador do celular:

```text
http://IP_DO_SERVIDOR:3333/api/health
```

Se aparecer o JSON de saúde da API, a comunicação está correta.

## Conta de teste

O banco é populado com dados demonstrativos na primeira execução. Também é possível criar uma conta pelo aplicativo.

## Funcionalidades implementadas

- Cadastro e login
- Sessão persistida localmente
- Mapa com pontos de descarte e ocorrências
- Localização atual do usuário
- Filtros por tipo de informação
- Busca de pontos de descarte por material
- Cadastro de ocorrência
- Categoria e gravidade
- Captura/seleção de imagem
- Consulta de detalhes da ocorrência
- Confirmação de ocorrência por outros usuários
- Alteração automática de status após confirmações
- Perfil do usuário
- API REST
- Persistência SQLite
- Upload de imagens
- Dados iniciais de demonstração

## Estrutura

```text
EcoMap/
├── README.md
├── INSTALACAO.md
├── instalar-windows.bat / instalar-windows.ps1 / instalar.sh
├── iniciar-windows.bat / iniciar-windows.ps1 / iniciar.sh
├── docs/
│   ├── API.md
│   └── ARQUITETURA.md
├── mobile/
│   ├── app/
│   ├── src/
│   ├── assets/
│   ├── app.json
│   ├── package.json
│   └── .env.example
└── backend/
    ├── src/
    ├── data/
    ├── uploads/
    ├── package.json
    └── .env.example
```

## Observação acadêmica

A solução implementa uma arquitetura distribuída mesmo sendo executada em uma única máquina física durante o desenvolvimento e a apresentação: o dispositivo móvel atua como cliente e o computador servidor hospeda os serviços de aplicação e persistência. A separação lógica entre cliente, API, banco e armazenamento permite demonstrar comunicação em rede e compartilhamento de dados entre múltiplos clientes.
