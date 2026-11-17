<#
.SYNOPSIS
  Removes FORGE files listed in the install manifest. Accepts the same -Target/-Scope/-Project/-DryRun parameters as install.ps1.
#>
[CmdletBinding()]
param(
  [ValidateSet('auto', 'claude', 'antigravity', 'all')] [string]$Target = 'auto',
  [ValidateSet('user', 'project')] [string]$Scope = 'user',
  [string]$Project = (Get-Location).Path,
  [switch]$DryRun
)
& (Join-Path $PSScriptRoot 'install.ps1') -Uninstall -Target $Target -Scope $Scope -Project $Project -DryRun:$DryRun
