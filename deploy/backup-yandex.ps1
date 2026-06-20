# Offsite copy of the newest DB dump to Yandex.Disk via its REST API.
# Yandex is reachable from RU without a VPN, so this is the offsite leg that the
# local folder + MinIO mirror (same mini-PC) can't provide.
#
# Called by backup.cmd when YANDEX_DISK_TOKEN is set in kanban-backup.secret.cmd.
#
# One-time token: https://yandex.ru/dev/disk/poligon/ (quick) or register an app
# at https://oauth.yandex.ru with scopes cloud_api.disk.read + cloud_api.disk.write,
# then put it in the secrets file:  set "YANDEX_DISK_TOKEN=<token>"
param(
  [string]$BackupDir = "C:\Users\minipc\kanban-backups",
  [string]$RemoteDir = "disk:/KanbanBackups",
  [int]$KeepDays = 14
)
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$token = $env:YANDEX_DISK_TOKEN
if (-not $token) { Write-Host "[yandex] no YANDEX_DISK_TOKEN, skip"; exit 0 }
$headers = @{ Authorization = "OAuth $token" }
$api = "https://cloud-api.yandex.net/v1/disk/resources"
function Enc([string]$s) { [uri]::EscapeDataString($s) }

# 1) Ensure the remote folder exists (409 = already there → fine).
try {
  Invoke-RestMethod -Method Put -Headers $headers -Uri "$api`?path=$(Enc $RemoteDir)" | Out-Null
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw }
}

# 2) Upload the newest dump.
$file = Get-ChildItem -Path $BackupDir -Filter "kanban-*.dump" |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $file) { Write-Host "[yandex] no dump found in $BackupDir"; exit 0 }
$remotePath = "$RemoteDir/$($file.Name)"
$up = Invoke-RestMethod -Headers $headers `
  -Uri "https://cloud-api.yandex.net/v1/disk/resources/upload?path=$(Enc $remotePath)&overwrite=true"
Invoke-RestMethod -Method Put -Uri $up.href -InFile $file.FullName | Out-Null
Write-Host "[yandex] uploaded $($file.Name)"

# 3) Rotate: delete remote dumps older than KeepDays.
$cutoff = (Get-Date).AddDays(-$KeepDays)
$items = (Invoke-RestMethod -Headers $headers `
  -Uri "$api`?path=$(Enc $RemoteDir)&limit=1000&fields=_embedded.items.name,_embedded.items.created")._embedded.items
foreach ($it in $items) {
  if ($it.name -like "kanban-*.dump" -and [datetime]$it.created -lt $cutoff) {
    try {
      Invoke-RestMethod -Method Delete -Headers $headers `
        -Uri "$api`?path=$(Enc "$RemoteDir/$($it.name)")&permanently=true" | Out-Null
      Write-Host "[yandex] rotated $($it.name)"
    } catch { }
  }
}
