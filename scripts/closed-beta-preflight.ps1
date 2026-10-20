# Read-only configuration check. Never print environment variable values or credentials.
$errors = [System.Collections.Generic.List[string]]::new()

function Read-Setting([string]$settingName) {
  return [Environment]::GetEnvironmentVariable($settingName)
}

function Require-Setting([string]$settingName) {
  $value = Read-Setting $settingName
  if ([string]::IsNullOrWhiteSpace($value)) {
    $errors.Add("Missing: $settingName")
  }
  return $value
}

function Require-HostedOrigin([string]$settingName) {
  $value = Require-Setting $settingName
  if ([string]::IsNullOrWhiteSpace($value)) { return $null }
  $uri = $null
  if (-not [Uri]::TryCreate($value, [UriKind]::Absolute, [ref]$uri) -or
      $uri.Scheme -ne 'https' -or
      $uri.Host -match '^(localhost|127\.|0\.0\.0\.0|\[?::1\]?)' -or
      $uri.AbsolutePath -ne '/' -or
      $uri.Query -ne '' -or
      $uri.Fragment -ne '' -or
      $uri.UserInfo -ne '') {
    $errors.Add("Invalid hosted HTTPS origin: $settingName")
    return $null
  }
  return $uri.GetLeftPart([UriPartial]::Authority)
}

if ((Read-Setting 'NODE_ENV') -ne 'production') { $errors.Add('NODE_ENV must be production') }
if ((Read-Setting 'RENDO_BETA_MODE') -ne 'true') { $errors.Add('RENDO_BETA_MODE must be true') }

$apiOrigin = Require-HostedOrigin 'API_ORIGIN'
$publicApiOrigin = Require-HostedOrigin 'NEXT_PUBLIC_API_URL'
$webOrigin = Require-HostedOrigin 'WEB_PUBLIC_URL'
$supabaseOrigin = Require-HostedOrigin 'SUPABASE_URL'
$publicSupabaseOrigin = Require-HostedOrigin 'NEXT_PUBLIC_SUPABASE_URL'
$anonKey = Require-Setting 'SUPABASE_ANON_KEY'
$publicAnonKey = Require-Setting 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
$serviceKey = Require-Setting 'SUPABASE_SERVICE_ROLE_KEY'
$allowedOrigins = Require-Setting 'WEB_ORIGINS'

if ($apiOrigin -and $publicApiOrigin -and $apiOrigin -ne $publicApiOrigin) {
  $errors.Add('API_ORIGIN and NEXT_PUBLIC_API_URL differ')
}
if ($supabaseOrigin -and $publicSupabaseOrigin -and $supabaseOrigin -ne $publicSupabaseOrigin) {
  $errors.Add('SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL differ')
}
if ($anonKey -and $publicAnonKey -and $anonKey -ne $publicAnonKey) {
  $errors.Add('SUPABASE_ANON_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY differ')
}
if ($anonKey -and $serviceKey -and $anonKey -eq $serviceKey) {
  $errors.Add('SUPABASE_SERVICE_ROLE_KEY must differ from the public key')
}
if ($allowedOrigins) {
  $originList = @($allowedOrigins.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($originList.Count -eq 0) { $errors.Add('WEB_ORIGINS must contain an origin') }
  foreach ($origin in $originList) {
    $uri = $null
    if (-not [Uri]::TryCreate($origin, [UriKind]::Absolute, [ref]$uri) -or
        $uri.Scheme -ne 'https' -or $uri.GetLeftPart([UriPartial]::Authority) -ne $origin -or
        $uri.Host -match '^(localhost|127\.|0\.0\.0\.0|\[?::1\]?)') {
      $errors.Add('WEB_ORIGINS contains a non-hosted or non-exact origin')
    }
  }
  if ($webOrigin -and $webOrigin -notin $originList) {
    $errors.Add('WEB_ORIGINS must include WEB_PUBLIC_URL')
  }
}

foreach ($name in @('AUTH_ALLOW_DEV_TOKENS', 'NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS', 'PAYMENTS_ENABLED', 'FISCAL_ENABLED')) {
  if ((Read-Setting $name) -eq 'true') { $errors.Add("Forbidden in beta: $name") }
}
if ($errors.Count -gt 0) {
  Write-Output 'BLOCKED: closed beta configuration'
  $errors | ForEach-Object { Write-Output $_ }
  exit 1
}
Write-Output 'PASS: closed beta configuration names and origins validated (no deployment performed)'
