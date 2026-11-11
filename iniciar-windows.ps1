# ===========================================================================
# EcoMap Jundiai - inicializacao no Windows
# Executado por iniciar-windows.bat depois da instalacao. Abre a API em uma
# janela separada e inicia o Expo para o celular.
# ===========================================================================

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$PortaApi   = 3333
$UrlSaude   = "http://localhost:$PortaApi/api/health"
$Utf8SemBom = New-Object System.Text.UTF8Encoding $false

function Ok($texto)    { Write-Host "  [OK] $texto" -ForegroundColor Green }
function Aviso($texto) { Write-Host "  [!]  $texto" -ForegroundColor Yellow }
function Falha($texto) {
  Write-Host ''
  Write-Host "  [ERRO] $texto" -ForegroundColor Red
  Write-Host ''
  exit 1
}
function Testar-Api {
  try {
    $r = Invoke-RestMethod -Uri $UrlSaude -TimeoutSec 2
    return ($r.status -eq 'ok')
  } catch { return $false }
}

# Usa C:\EcoMap quando a instalação foi feita lá; senão, a pasta deste script.
# Recarrega o PATH do registro, para enxergar um Node.js recém-instalado.
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
            [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Falha 'Node.js não encontrado. Execute instalar-windows.bat primeiro.'
}

$Raiz = 'C:\EcoMap'
if (-not (Test-Path (Join-Path $Raiz 'backend\node_modules'))) { $Raiz = $PSScriptRoot }
$Backend = Join-Path $Raiz 'backend'
$Mobile  = Join-Path $Raiz 'mobile'
if (-not (Test-Path (Join-Path $Backend 'node_modules')) -or -not (Test-Path (Join-Path $Mobile 'node_modules'))) {
  Falha 'O projeto ainda não foi instalado. Execute instalar-windows.bat primeiro.'
}

# Confere se as dependências instaladas batem com o mobile\package.json: SDK do
# Expo diferente (instalação antiga) ou pacote ausente (por exemplo, um
# expo-linking que faltou) fazem o Expo Go falhar. Nesses casos reinstala as
# dependências e inicia o Expo com --clear, para o Metro descartar o cache antigo.
$limparCache = $false
$problemaDeps = ''
try {
  $pkg = Get-Content (Join-Path $Mobile 'package.json') -Raw | ConvertFrom-Json
  $faltando = @($pkg.dependencies.PSObject.Properties.Name | Where-Object {
    -not (Test-Path (Join-Path $Mobile ("node_modules\" + $_ + "\package.json")))
  })
  if ($faltando.Count -gt 0) {
    $problemaDeps = 'pacotes ausentes: ' + ($faltando -join ', ')
  } else {
    $sdkEsperado = (($pkg.dependencies.expo -replace '[^0-9.]', '').Split('.'))[0]
    $pkgExpo = Get-Content (Join-Path $Mobile 'node_modules\expo\package.json') -Raw | ConvertFrom-Json
    $sdkInstalado = ($pkgExpo.version.Split('.'))[0]
    if ($sdkEsperado -ne $sdkInstalado) { $problemaDeps = "Expo SDK $sdkInstalado instalado, projeto usa SDK $sdkEsperado" }
  }
} catch { $problemaDeps = 'não foi possível ler as dependências instaladas' }
if ($problemaDeps) {
  Aviso "Dependências do app desatualizadas ($problemaDeps). Atualizando..."
  Push-Location $Mobile
  & npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { & npm install --no-audit --no-fund --legacy-peer-deps }
  if ($LASTEXITCODE -eq 0) {
    & npx expo install --fix
    if ($LASTEXITCODE -ne 0) { & npx expo install --fix -- --legacy-peer-deps }
  }
  $codigo = $LASTEXITCODE
  Pop-Location
  if ($codigo -ne 0) { Falha 'Não foi possível atualizar as dependências. Execute instalar-windows.bat novamente.' }
  Ok 'Dependências atualizadas'
  $limparCache = $true
}

Write-Host ''
Write-Host '#############################################################' -ForegroundColor Green
Write-Host '#              EcoMap Jundiaí - Iniciando                   #' -ForegroundColor Green
Write-Host '#############################################################' -ForegroundColor Green
Write-Host "  Pasta: $Raiz"

# ---------------------------------------------------------------------------
# 1. API em uma janela separada (npm run dev em backend\)
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '=== 1/2 Iniciando a API ===' -ForegroundColor Cyan
if (Testar-Api) {
  Ok "A API já estava em execução em $UrlSaude"
} else {
  # A nova janela carrega as variáveis do backend\.env (PORT, JWT_SECRET)
  # antes de executar "npm run dev", pois o server.js lê process.env.
  $scriptApi = @"
`$Host.UI.RawUI.WindowTitle = 'EcoMap API (porta $PortaApi) - feche para parar'
Set-Location '$Backend'
if (Test-Path '.env') {
  Get-Content '.env' | ForEach-Object {
    if (`$_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') { Set-Item -Path ("env:" + `$matches[1]) -Value `$matches[2] }
  }
}
npm run dev
"@
  $codificado = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($scriptApi))
  Start-Process powershell -ArgumentList "-NoExit -NoProfile -ExecutionPolicy Bypass -EncodedCommand $codificado" | Out-Null
}

# ---------------------------------------------------------------------------
# Confere se o IP do mobile\.env ainda pertence a este computador (o IP pode
# mudar ao trocar de rede Wi-Fi) e oferece a atualização automática.
# ---------------------------------------------------------------------------
$envMobile = Join-Path $Mobile '.env'
$ipConfigurado = ''
if (Test-Path $envMobile) {
  $linha = Get-Content $envMobile | Where-Object { $_ -match 'EXPO_PUBLIC_API_URL' } | Select-Object -First 1
  if ($linha -match 'https?://([^:/]+)') { $ipConfigurado = $matches[1] }
}
$ipsAtuais = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -ExpandProperty IPAddress)
if ($ipsAtuais.Count -gt 0 -and $ipsAtuais -notcontains $ipConfigurado) {
  $ipNovo = $ipsAtuais[0]
  try {
    $ipGateway = @(Get-NetIPConfiguration -ErrorAction Stop |
      Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
      ForEach-Object { $_.IPv4Address.IPAddress })
    if ($ipGateway.Count -gt 0) { $ipNovo = $ipGateway[0] }
  } catch {}
  Write-Host ''
  Aviso "O mobile\.env aponta para '$ipConfigurado', que não é um IP deste computador agora."
  $resp = Read-Host "  Atualizar para $ipNovo? (S/N)"
  if ($resp -match '^[sS]') {
    [System.IO.File]::WriteAllText($envMobile, "EXPO_PUBLIC_API_URL=http://${ipNovo}:$PortaApi/api`r`n", $Utf8SemBom)
    $ipConfigurado = $ipNovo
    Ok "mobile\.env atualizado para http://${ipNovo}:$PortaApi/api"
  }
}

# ---------------------------------------------------------------------------
# 3. Expo em modo LAN (QR Code para o Expo Go)
# ---------------------------------------------------------------------------
Write-Host ''
# Conta Expo: lembra de fazer o login, se ainda não foi feito. Os comandos do
# Expo escrevem no stderr, por isso este trecho usa 'Continue'.
Push-Location $Mobile
$ErrorActionPreference = 'Continue'
& npx expo whoami *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Aviso 'Este computador não está conectado a uma conta Expo (crie em https://expo.dev/signup).'
  $resp = Read-Host '  Fazer login agora com "npx expo login"? (S/N) [S]'
  if ($resp -notmatch '^[nN]') {
    & npx expo login
    if ($LASTEXITCODE -ne 0) { Aviso 'Login não concluído. Execute depois: npx expo login' }
  }
}
$ErrorActionPreference = 'Stop'
Pop-Location

Write-Host '=== 2/2 Iniciando o aplicativo (Expo) ===' -ForegroundColor Cyan
Write-Host ''
Write-Host '  >>> Abra no CELULAR pelo app Expo Go:' -ForegroundColor Yellow
Write-Host '      Android: Expo Go > "Scan QR code"   |   iPhone: app Câmera' -ForegroundColor Yellow
Write-Host '  >>> NÃO aperte "w" e NÃO use o navegador: o app não roda na web.' -ForegroundColor Yellow
Write-Host "  >>> Celular e computador precisam estar na mesma rede Wi-Fi. API: http://${ipConfigurado}:$PortaApi/api" -ForegroundColor Yellow
Write-Host '  >>> Se aparecer "Port 8081 is being used... Use port 8082 instead?", aceite (Enter ou Y).' -ForegroundColor Yellow
Write-Host '  >>> Depois de registrar uma ocorrência, recarregue o app: tecla "r" aqui na janela' -ForegroundColor Yellow
Write-Host '      (ou agite o celular e toque em "Reload"). Na aba Ocorrências, arraste a lista para baixo.' -ForegroundColor Yellow
Write-Host '  Para encerrar: Ctrl+C aqui e feche a janela "EcoMap API".'
Write-Host ''

# Faz o Expo anunciar o mesmo IP usado pela API (evita escolher um adaptador
# virtual, como VirtualBox ou WSL, quando o computador tem vários).
if ($ipConfigurado) { $env:REACT_NATIVE_PACKAGER_HOSTNAME = $ipConfigurado }
Set-Location $Mobile
if ($limparCache) { & npx expo start --lan --clear } else { & npx expo start --lan }
