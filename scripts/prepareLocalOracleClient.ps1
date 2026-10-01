param(
  [Parameter(Mandatory = $true)]
  [string]$ZipPath
)

$ErrorActionPreference = 'Stop'
$archivePath = (Resolve-Path -LiteralPath $ZipPath).Path
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$clientDir = [IO.Path]::GetFullPath((Join-Path $projectRoot '.oracle-client\instantclient_19_24'))
if (-not $clientDir.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'El destino debe estar dentro del proyecto.'
}

New-Item -ItemType Directory -Force -Path $clientDir | Out-Null
Add-Type -AssemblyName System.IO.Compression
$archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $files = @($archive.Entries | Where-Object {
    $_.FullName -match '^api-oracle-coopya/instantclient_19_24/[^/]+\.(dll|LICENSE|README)$'
  })
  if (-not ($files | Where-Object Name -EQ 'oci.dll') -or
      -not ($files | Where-Object Name -EQ 'oraociicus19.dll')) {
    throw 'El ZIP no contiene Oracle Instant Client 19c completo.'
  }
  foreach ($file in $files) {
    $destination = Join-Path $clientDir $file.Name
    if (-not (Test-Path -LiteralPath $destination)) {
      [IO.Compression.ZipFileExtensions]::ExtractToFile($file, $destination)
    }
  }
} finally {
  $archive.Dispose()
}

Write-Output "Oracle Instant Client listo en $clientDir"
Write-Output 'No se copiaron las credenciales del ZIP al proyecto.'
