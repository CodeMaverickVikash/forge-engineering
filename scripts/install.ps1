<#
.SYNOPSIS
  FORGE installer for Claude Code and Google Antigravity (Windows PowerShell 5.1+ / PowerShell 7+).
.DESCRIPTION
  Copies the prebuilt adapters from dist\ (no Node.js required). Tracks installed paths in a manifest,
  never overwrites files it did not install unless -Force, and -Uninstall removes only manifest-listed paths.
.EXAMPLE
  .\scripts\install.ps1                         # user scope, auto-detect platforms
  .\scripts\install.ps1 -Target all -Scope project -Project C:\code\myapp
  .\scripts\install.ps1 -Uninstall
#>
[CmdletBinding()]
param(
  [ValidateSet('auto', 'claude', 'antigravity', 'all')] [string]$Target = 'auto',
  [ValidateSet('user', 'project')] [string]$Scope = 'user',
  [string]$Project = (Get-Location).Path,
  [switch]$DryRun,
  [switch]$Force,
  [switch]$Uninstall
)
$ErrorActionPreference = 'Stop'
$RepoDir = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $RepoDir 'dist'
$Version = (Get-Content (Join-Path $RepoDir 'VERSION') -Raw).Trim()
$HomeDir = [Environment]::GetFolderPath('UserProfile')
if ($env:HOME -and (Test-Path $env:HOME)) { $HomeDir = $env:HOME }
$ClaudeUserRoot = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HomeDir '.claude' }
$AgUserRoot = if ($env:FORGE_ANTIGRAVITY_HOME) { $env:FORGE_ANTIGRAVITY_HOME } else { Join-Path (Join-Path $HomeDir '.gemini') 'config' }
if ($Scope -eq 'project') {
  if (-not (Test-Path $Project -PathType Container)) { throw "project dir not found: $Project" }
  $Project = (Resolve-Path $Project).Path
}

$targets = @()
switch ($Target) {
  'auto' {
    if (Test-Path $ClaudeUserRoot) { $targets += 'claude' }
    if (Test-Path (Join-Path $HomeDir '.gemini')) { $targets += 'antigravity' }
    if ($targets.Count -eq 0) { $targets = @('claude') }
  }
  'all' { $targets = @('claude', 'antigravity') }
  default { $targets = @($Target) }
}

function Invoke-Step([string]$Description, [scriptblock]$Action) {
  if ($DryRun) { Write-Host "  [dry-run] $Description" } else { & $Action }
}

function Install-ForgePlatform([string]$Label, [string]$Root, [string]$SrcName, [string]$WorkflowRel) {
  $src = Join-Path $Dist $SrcName
  if (-not (Test-Path $src)) { throw "missing $src - run: node scripts/build.mjs" }
  $manifest = Join-Path $Root 'skills/forge/.forge-install-manifest'
  $items = @()
  Get-ChildItem (Join-Path $src 'skills') -Directory | Sort-Object Name | ForEach-Object { $items += "skills/$($_.Name)" }
  Get-ChildItem (Join-Path $src 'agents') -Filter *.md | Sort-Object Name | ForEach-Object { $items += "agents/$($_.Name)" }
  if ($WorkflowRel) { $items += $WorkflowRel }
  $old = @()
  if (Test-Path $manifest) { $old = @(Get-Content $manifest | Where-Object { $_ -and -not $_.StartsWith('#') }) }

  if ($Uninstall) {
    if ($old.Count -eq 0) { Write-Host "* ${Label}: FORGE is not installed at $Root"; return }
    foreach ($p in $old) { $t = Join-Path $Root $p; if (Test-Path $t) { Invoke-Step "remove $t" { Remove-Item $t -Recurse -Force } } }
    Write-Host "OK ${Label}: removed $($old.Count) FORGE item(s) from $Root"; return
  }

  $conflicts = @($items | Where-Object { (Test-Path (Join-Path $Root $_)) -and ($old -notcontains $_) })
  if ($conflicts.Count -gt 0 -and -not $Force) {
    $conflicts | ForEach-Object { Write-Warning "conflict (not installed by FORGE): $_" }
    throw "${Label}: refusing to overwrite existing files at $Root (re-run with -Force to replace them)"
  }
  foreach ($p in $old) { $t = Join-Path $Root $p; if (Test-Path $t) { Invoke-Step "remove $t" { Remove-Item $t -Recurse -Force } } }
  Invoke-Step "mkdir $Root\skills, $Root\agents" { New-Item -ItemType Directory -Force (Join-Path $Root 'skills'), (Join-Path $Root 'agents') | Out-Null }
  foreach ($p in $items) {
    $dst = Join-Path $Root $p
    if ($p.StartsWith('skills/')) {
      Invoke-Step "copy $p" { if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }; Copy-Item (Join-Path $src $p) $dst -Recurse }
    } elseif ($p.StartsWith('agents/')) {
      Invoke-Step "copy $p" { Copy-Item (Join-Path $src $p) $dst -Force }
    } else {
      Invoke-Step "copy workflow -> $p" { New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null; Copy-Item (Join-Path $src 'workflows/forge.md') $dst -Force }
    }
  }
  if (-not $DryRun) {
    # Point the git-guard hooks at this install (plugin installs resolve the token natively).
    $guardHome = ((Resolve-Path (Join-Path $Root 'skills/forge')).Path) -replace '\\', '/'
    $token = [regex]::Escape('${CLAUDE_PLUGIN_ROOT}/skills/forge')
    $winToken = [regex]::Escape('${CLAUDE_PLUGIN_ROOT}\skills\forge')   # PowerShell rules with Windows paths
    $utf8 = New-Object System.Text.UTF8Encoding $false   # no BOM: frontmatter must start at byte 0
    foreach ($p in $items) {
      $files = @()
      if ($p -like 'agents/*.md') { $files = @(Join-Path $Root $p) } elseif ($p -eq 'skills/forge') { $files = @((Join-Path $Root 'skills/forge/SKILL.md'), (Join-Path $Root 'skills/forge/platform.json')) }
      foreach ($f in $files) {
        if (-not (Test-Path $f)) { continue }
        $text = [IO.File]::ReadAllText($f)
        if ($text -match $token -or $text -match $winToken) { [IO.File]::WriteAllText($f, (($text -replace $token, $guardHome.Replace('$', '$$')) -replace $winToken, ($guardHome -replace '/', '\').Replace('$', '$$')), $utf8) }
      }
    }
    $lines = @("# FORGE install manifest $Version - paths relative to $Root") + $items
    [IO.File]::WriteAllLines($manifest, [string[]]$lines)
  }
  $ns = @($items | Where-Object { $_.StartsWith('skills/') }).Count
  $na = @($items | Where-Object { $_.StartsWith('agents/') }).Count
  $wfNote = if ($WorkflowRel) { ', legacy workflow' } else { '' }
  Write-Host "OK ${Label}: installed $ns skills, $na agents$wfNote -> $Root"
}

$modeLabel = if ($Uninstall) { 'uninstall' } else { 'install' }
Write-Host "FORGE $Version - $modeLabel (scope: $Scope, target: $($targets -join ','))"
foreach ($t in $targets) {
  if ($t -eq 'claude') {
    $root = if ($Scope -eq 'project') { Join-Path $Project '.claude' } else { $ClaudeUserRoot }
    Install-ForgePlatform 'Claude Code' $root 'claude-code' ''
  } else {
    if ($Scope -eq 'project') { Install-ForgePlatform 'Antigravity' (Join-Path $Project '.agents') 'antigravity' 'workflows/forge.md' }
    else { Install-ForgePlatform 'Antigravity' $AgUserRoot 'antigravity' 'global_workflows/forge.md' }
  }
}

# Self-check when Node is available (installing does not need it): the install matches dist\ byte for byte and the
# git guard works, or (after -Uninstall) nothing FORGE installed is left behind.
if (-not $DryRun -and (Get-Command node -ErrorAction SilentlyContinue)) {
  $verifyArgs = @('--target', ($targets -join ','), '--scope', $Scope, '--project', $Project)
  if ($Uninstall) { $verifyArgs += '--absent' }
  & node (Join-Path $RepoDir 'scripts/verify-install.mjs') @verifyArgs
  if ($LASTEXITCODE -ne 0) { throw 'FORGE verification failed (see above)' }
}

if (-not $Uninstall -and -not $DryRun) {
  Write-Host @'

Next steps
  * Restart Claude Code / Antigravity (or start a new session) so the skills and agents load.
  * Run:  /forge <what you want done>      e.g.  /forge Fix the payment issue
  * Optional browser QA (recommended for web apps):
      claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --redactNetworkHeaders
      claude mcp add playwright -- npx @playwright/mcp@latest
    (Antigravity: add the same servers to ~/.gemini/config/mcp_config.json - see docs/installation.md)
  * FORGE never commits, pushes or opens pull requests.
'@
}
