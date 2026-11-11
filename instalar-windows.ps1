# ===========================================================================
# EcoMap Jundiai - instalacao no Windows 10/11
# Executado por instalar-windows.bat. Nao altera o codigo do sistema: instala
# o Node.js (se faltar), copia o projeto para C:\EcoMap, instala as
# dependencias, cria os arquivos .env, libera as portas no firewall e conecta
# a conta Expo.
# ===========================================================================

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
# Windows PowerShell 5.1 usa TLS antigo por padrão; nodejs.org exige TLS 1.2+.
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$Destino     = 'C:\EcoMap'
$Origem      = $PSScriptRoot
$PortaApi    = 3333
$PortasExpo  = '8081-8090'
$NomeRegra   = 'EcoMap (API 3333 e Expo 8081-8090)'
$RegraAntiga = 'EcoMap (API 3333 e Expo 8081)'
$Utf8SemBom  = New-Object System.Text.UTF8Encoding $false

function Titulo($texto) {
  Write-Host ''
  Write-Host "=== $texto ===" -ForegroundColor Cyan
}
function Ok($texto)    { Write-Host "  [OK] $texto" -ForegroundColor Green }
function Aviso($texto) { Write-Host "  [!]  $texto" -ForegroundColor Yellow }
function Falha($texto) {
  Write-Host ''
  Write-Host "  [ERRO] $texto" -ForegroundColor Red
  Write-Host ''
  exit 1
}

function Testar-IPv4($ip) {
  return ($ip -match '^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$') -and
         (($ip.Split('.') | Where-Object { [int]$_ -gt 255 }).Count -eq 0)
}

# Recarrega o PATH do registro: depois de instalar o Node.js, os comandos
# node e npm ficam disponíveis sem precisar abrir outra janela.
function Atualizar-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Versao-Node {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $null }
  $texto = (& node -v).Trim().TrimStart('v')
  return [version]($texto -replace '[^0-9.].*$', '')
}
# O backend usa o módulo nativo node:sqlite (22.13+) e o Expo SDK 58 exige
# 22.13+ na linha 22, 24.3+ na linha 24 ou 26+.
function Node-Compativel($versao) {
  if (-not $versao) { return $false }
  return ($versao.Major -eq 22 -and $versao -ge [version]'22.13.0') -or
         ($versao.Major -eq 24 -and $versao -ge [version]'24.3.0') -or
         ($versao.Major -ge 26)
}
# Instala o Node.js LTS: primeiro pelo winget (gerenciador de pacotes do
# Windows 10/11); se ele não existir ou falhar, baixa o instalador oficial
# (.msi) de nodejs.org.
function Instalar-Node {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host '  Instalando o Node.js LTS pelo winget...'
    & winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    Atualizar-Path
    if (Node-Compativel (Versao-Node)) { return $true }
    # Com uma versão antiga já instalada, o winget pede "upgrade" em vez de "install".
    & winget upgrade -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    Atualizar-Path
    if (Node-Compativel (Versao-Node)) { return $true }
  }
  try {
    $arquitetura = 'x64'
    if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { $arquitetura = 'arm64' }
    $base = 'https://nodejs.org/dist/latest-v24.x/'
    $somas = (Invoke-WebRequest -Uri ($base + 'SHASUMS256.txt') -UseBasicParsing).Content
    if ($somas -is [byte[]]) { $somas = [System.Text.Encoding]::ASCII.GetString($somas) }
    $nomeMsi = [regex]::Match($somas, "node-v[\d.]+-$arquitetura\.msi").Value
    if (-not $nomeMsi) { return $false }
    $msi = Join-Path $env:TEMP $nomeMsi
    Write-Host "  Baixando $nomeMsi de nodejs.org..."
    Invoke-WebRequest -Uri ($base + $nomeMsi) -OutFile $msi -UseBasicParsing
    Write-Host '  Instalando (o Windows vai pedir permissão de administrador)...'
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /passive /norestart" -Wait -Verb RunAs | Out-Null
    Atualizar-Path
    return (Node-Compativel (Versao-Node))
  } catch {
    return $false
  }
}

Write-Host ''
Write-Host '#############################################################' -ForegroundColor Green
Write-Host '#            EcoMap Jundiaí - Instalação (Windows)          #' -ForegroundColor Green
Write-Host '#############################################################' -ForegroundColor Green

# ---------------------------------------------------------------------------
# 1. Node.js: se faltar ou for antigo, oferece instalar a versão LTS
# ---------------------------------------------------------------------------
Titulo '1/7 Verificando o Node.js'
$versaoNode = Versao-Node
if (-not (Node-Compativel $versaoNode)) {
  if ($versaoNode) {
    Aviso "Node.js $versaoNode não é compatível (precisa de 22.13+, 24.3+ ou 26+)."
  } else {
    Aviso 'Node.js não encontrado.'
  }
  $resp = Read-Host '  Instalar o Node.js LTS automaticamente agora? (S/N) [S]'
  if ($resp -match '^[nN]') {
    Falha ("Instale o Node.js LTS em https://nodejs.org, feche esta janela e execute`n" +
           "  instalar-windows.bat novamente.")
  }
  if (-not (Instalar-Node)) {
    Falha ("Não foi possível instalar o Node.js automaticamente.`n`n" +
           "  Instale a versão LTS em https://nodejs.org, feche esta janela e execute`n" +
           "  instalar-windows.bat novamente.")
  }
  $versaoNode = Versao-Node
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Falha 'npm não encontrado. Reinstale o Node.js pela versão LTS em https://nodejs.org.'
}
Ok "Node.js $versaoNode"

# ---------------------------------------------------------------------------
# 2. Copia do projeto para C:\EcoMap (sem node_modules e sem backend\data)
# ---------------------------------------------------------------------------
Titulo "2/7 Copiando o projeto para $Destino"
if (-not (Test-Path (Join-Path $Origem 'backend\src\server.js'))) {
  Falha ("Pasta do projeto não encontrada. Extraia o arquivo .zip inteiro primeiro (botão direito >`n" +
         "  Extrair tudo) e execute instalar-windows.bat de dentro da pasta extraída.")
}
$origemNormal  = (Resolve-Path $Origem).Path.TrimEnd('\')
$mesmoLocal = $false
if (Test-Path $Destino) {
  $mesmoLocal = ($origemNormal -ieq (Resolve-Path $Destino).Path.TrimEnd('\'))
}

if ($mesmoLocal) {
  Ok "O projeto já está em $Destino. Nada a copiar."
} else {
  $copiar = $true
  if (Test-Path $Destino) {
    Aviso "A pasta $Destino já existe."
    $resp = Read-Host '  Sobrescrever os arquivos do projeto com esta versão? (S/N)'
    if ($resp -notmatch '^[sS]') {
      $copiar = $false
      Aviso "Mantida a versão que já está em $Destino. A instalação continua com ela."
    }
  }
  if ($copiar) {
    # robocopy: /E copia subpastas; /XD ignora node_modules, .expo e o banco
    # (backend\data), que é recriado na primeira execução da API.
    & robocopy $origemNormal $Destino /E /XD node_modules .expo .git (Join-Path $origemNormal 'backend\data') /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { Falha "Não foi possível copiar o projeto para $Destino (robocopy $LASTEXITCODE)." }
    Ok "Projeto copiado para $Destino"
  }
}
$Backend = Join-Path $Destino 'backend'
$Mobile  = Join-Path $Destino 'mobile'

# ---------------------------------------------------------------------------
# 3. Backend: dependências e backend\.env
# ---------------------------------------------------------------------------
Titulo '3/7 Instalando o backend (API)'
Push-Location $Backend
& npm install --no-audit --no-fund
$codigo = $LASTEXITCODE
Pop-Location
if ($codigo -ne 0) { Falha 'npm install falhou no backend. Verifique a conexão com a internet e tente de novo.' }
$envBackend = Join-Path $Backend '.env'
if (-not (Test-Path $envBackend)) {
  Copy-Item (Join-Path $Backend '.env.example') $envBackend
  Ok 'backend\.env criado a partir do .env.example'
} else {
  Ok 'backend\.env já existia e foi mantido'
}

# ---------------------------------------------------------------------------
# 4. IPv4 do computador na rede local (o celular acessa a API por ele)
# ---------------------------------------------------------------------------
Titulo '4/7 Descobrindo o IP do computador na rede local'
$candidatos = @()
try {
  # Prioriza adaptadores com gateway padrão (a rede Wi-Fi/cabo em uso).
  $candidatos = @(Get-NetIPConfiguration -ErrorAction Stop |
    Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
    ForEach-Object { $_.IPv4Address.IPAddress })
} catch {}
$todos = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -ExpandProperty IPAddress)
$candidatos = @($candidatos + $todos | Where-Object { $_ } | Select-Object -Unique)

$ipSugerido = ''
if ($candidatos.Count -gt 0) {
  $ipSugerido = $candidatos[0]
  Write-Host '  Endereços IPv4 encontrados:'
  foreach ($c in $candidatos) { Write-Host "    - $c" }
}
do {
  if ($ipSugerido) {
    $resp = Read-Host "  IP a usar [Enter = $ipSugerido] ou digite outro"
    if ([string]::IsNullOrWhiteSpace($resp)) { $ip = $ipSugerido } else { $ip = $resp.Trim() }
  } else {
    $ip = (Read-Host '  Não foi possível detectar o IP. Digite o IPv4 deste computador (veja com ipconfig)').Trim()
  }
  $valido = Testar-IPv4 $ip
  if (-not $valido) { Aviso "'$ip' não é um IPv4 válido (exemplo: 192.168.0.25)." }
} until ($valido)
Ok "IP configurado: $ip"

# ---------------------------------------------------------------------------
# 5. Mobile: dependências e mobile\.env com o endereço da API
# ---------------------------------------------------------------------------
Titulo '5/7 Instalando o aplicativo (mobile)'
Push-Location $Mobile
& npm install --no-audit --no-fund
$codigo = $LASTEXITCODE
if ($codigo -ne 0) {
  Aviso 'npm install falhou; tentando novamente com --legacy-peer-deps...'
  & npm install --no-audit --no-fund --legacy-peer-deps
  $codigo = $LASTEXITCODE
}
if ($codigo -ne 0) { Pop-Location; Falha 'npm install falhou no mobile. Verifique a conexão com a internet e tente de novo.' }
# Alinha cada dependência à versão exata que o Expo SDK 58 (o mesmo do Expo Go
# atual da loja) espera. Sem isso, o Expo Go pode recusar o projeto.
Write-Host '  Instalando e alinhando os pacotes do Expo SDK 58 (npx expo install --fix)...'
& npx expo install --fix
if ($LASTEXITCODE -ne 0) {
  & npx expo install --fix -- --legacy-peer-deps
}
Pop-Location
if ($LASTEXITCODE -ne 0) {
  Aviso 'Não foi possível alinhar as versões automaticamente. Execute "npx expo install --fix" na pasta mobile.'
} else {
  Ok 'Dependências alinhadas com o Expo SDK 58'
}
# Gravado em UTF-8 sem BOM: com BOM o Expo não reconhece a variável.
[System.IO.File]::WriteAllText((Join-Path $Mobile '.env'), "EXPO_PUBLIC_API_URL=http://${ip}:$PortaApi/api`r`n", $Utf8SemBom)
Ok "mobile\.env criado: EXPO_PUBLIC_API_URL=http://${ip}:$PortaApi/api"

# ---------------------------------------------------------------------------
# 6. Firewall: libera a API (3333) e o servidor do Expo (8081-8090) na rede privada
# ---------------------------------------------------------------------------
Titulo '6/7 Liberando as portas no Firewall do Windows'
# Libera 8081 a 8090 (e não só 8081): se a 8081 estiver ocupada, o Expo
# oferece usar a próxima porta livre, e ela também precisa estar liberada.
$comandoFirewall = "Get-NetFirewallRule -DisplayName '$NomeRegra','$RegraAntiga' -ErrorAction SilentlyContinue | Remove-NetFirewallRule; " +
  "New-NetFirewallRule -DisplayName '$NomeRegra' -Direction Inbound -Protocol TCP -LocalPort $PortaApi,'$PortasExpo' -Action Allow -Profile Private | Out-Null"
$ehAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
$firewallOk = $false
try {
  if ($ehAdmin) {
    Invoke-Expression $comandoFirewall
  } else {
    Write-Host '  O Windows vai pedir permissão de administrador para criar a regra.'
    $codificado = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($comandoFirewall))
    $proc = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden `
      -ArgumentList "-NoProfile -ExecutionPolicy Bypass -EncodedCommand $codificado"
    if ($proc.ExitCode -ne 0) { throw 'falha' }
  }
  if (Get-NetFirewallRule -DisplayName $NomeRegra -ErrorAction SilentlyContinue) { $firewallOk = $true }
} catch {}
if ($firewallOk) {
  Ok "Regra '$NomeRegra' criada (TCP $PortaApi e $PortasExpo, rede privada)"
} else {
  Aviso 'Não foi possível criar a regra de firewall (sem permissão de administrador).'
  Write-Host '  Para liberar manualmente, abra o PowerShell como Administrador e execute:'
  Write-Host "    New-NetFirewallRule -DisplayName 'EcoMap' -Direction Inbound -Protocol TCP -LocalPort $PortaApi,'$PortasExpo' -Action Allow -Profile Private"
  Write-Host '  Ou, quando o Windows perguntar se o Node.js pode se comunicar, marque "Redes privadas" e clique em Permitir.'
}
try {
  $publicas = @(Get-NetConnectionProfile -ErrorAction Stop | Where-Object { $_.NetworkCategory -eq 'Public' })
  if ($publicas.Count -gt 0) {
    Aviso "A rede '$($publicas[0].Name)' está marcada como PÚBLICA. A regra vale só para redes privadas."
    Write-Host '  Altere em: Configurações > Rede e Internet > (sua rede) > Perfil de rede: Privada.'
  }
} catch {}

# ---------------------------------------------------------------------------
# 7. Conta Expo: verifica o login (npx expo whoami) e, se preciso, abre o
#    cadastro no navegador e executa "npx expo login"
# ---------------------------------------------------------------------------
Titulo '7/7 Conta Expo'
Push-Location $Mobile
# Os comandos do Expo escrevem avisos no stderr; com 'Stop' o PowerShell 5.1
# trataria isso como erro, então este trecho usa 'Continue'.
$ErrorActionPreference = 'Continue'
$usuarioExpo = (& npx expo whoami 2>$null | Where-Object { $_ -match '\S' } | Select-Object -Last 1)
$logadoExpo = ($LASTEXITCODE -eq 0 -and $usuarioExpo)
if ($logadoExpo) {
  Ok "Conectado à conta Expo: $usuarioExpo"
} else {
  Aviso 'Este computador ainda não está conectado a uma conta Expo.'
  Write-Host '  O login é feito uma vez só, com "npx expo login". A conta é gratuita.'
  $resp = Read-Host '  Você já tem conta no Expo? (S/N)'
  if ($resp -notmatch '^[sS]') {
    Write-Host '  Abrindo https://expo.dev/signup no navegador. Crie a conta e volte aqui.'
    try { Start-Process 'https://expo.dev/signup' } catch {}
    Read-Host '  Pressione Enter depois de criar a conta' | Out-Null
  }
  Write-Host '  Executando "npx expo login" (informe o e-mail ou usuário e a senha da conta Expo):'
  & npx expo login
  if ($LASTEXITCODE -eq 0) {
    $logadoExpo = $true
    Ok 'Login no Expo concluído'
  } else {
    Aviso 'O login não foi concluído. Depois, na pasta mobile, execute: npx expo login'
  }
}
$ErrorActionPreference = 'Stop'
Pop-Location

# ---------------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '#############################################################' -ForegroundColor Green
Write-Host '#                  Instalação concluída                     #' -ForegroundColor Green
Write-Host '#############################################################' -ForegroundColor Green
Write-Host ''
Write-Host "  Pasta do projeto : $Destino"
Write-Host "  IP configurado   : $ip  (API em http://${ip}:$PortaApi/api)"
Write-Host "  Para iniciar     : clique duas vezes em $Destino\iniciar-windows.bat"
Write-Host '  Conta de demonstração: demo@ecomap.local / 123456'
if ($logadoExpo) { Write-Host '  Conta Expo       : conectada' } else { Write-Host '  Conta Expo       : PENDENTE (execute "npx expo login" na pasta mobile)' }
Write-Host ''
Write-Host '  IMPORTANTE:' -ForegroundColor Yellow
Write-Host '  - Instale o app Expo Go no celular (Play Store ou App Store).' -ForegroundColor Yellow
Write-Host '  - O aplicativo abre no CELULAR, pelo Expo Go. Não aperte "w" e não use o navegador.' -ForegroundColor Yellow
Write-Host '  - Se o Expo disser que a porta 8081 está em uso e oferecer outra, aceite (Enter ou Y).' -ForegroundColor Yellow
Write-Host '  - Depois de registrar uma ocorrência, recarregue o app: tecla "r" na janela do Expo.' -ForegroundColor Yellow
Write-Host ''
