# generate_index.ps1 — genera index.html y _INDICE.txt
$ErrorActionPreference = 'Stop'
$root = Get-Location

Write-Host "Generando índice en: $root"

# Recolectar archivos numerados en la raíz (p. ej. '001 - Titulo.txt')
$rootFiles = Get-ChildItem -Path $root -File -Filter '*.txt' |
    Where-Object { -not ($_.Name.StartsWith('_')) -and ($_.Name -match '^\d+') } |
    ForEach-Object {
        [PSCustomObject]@{
            Number = [int]($_.Name -replace '^([0-9]+).*','$1')
            Title  = ($_.BaseName -replace '^[0-9]+\s*-\s*','')
            RelPath = $_.Name
        }
    }

# Recolectar lecciones dentro de outputs/*/leccion.txt
$outputFiles = @()
if(Test-Path (Join-Path $root 'outputs')){
    $dirs = Get-ChildItem -Path (Join-Path $root 'outputs') -Directory -ErrorAction SilentlyContinue
    foreach($d in $dirs){
        $leccionPath = Join-Path $d.FullName 'leccion.txt'
        if(Test-Path $leccionPath){
            $name = $d.Name
            $num = 0
            if($name -match '^([0-9]+)') { $num = [int]$matches[1] }
            $title = ($name -replace '^[0-9]+\s*-\s*','')
            $rel = "outputs/$name/leccion.txt"
            $outputFiles += [PSCustomObject]@{ Number=$num; Title=$title; RelPath=$rel }
        }
    }
}

# También buscar en subcarpetas inmediatas del root (estructura: ./NNN - Título/leccion.txt)
$dirFiles = @()
$subdirs = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.git' -and -not ($_.Name.StartsWith('_')) }
foreach($d in $subdirs){
    $leccionPath = Join-Path $d.FullName 'leccion.txt'
    if(Test-Path $leccionPath){
        $name = $d.Name
        $num = 0
        if($name -match '^([0-9]+)') { $num = [int]$matches[1] }
        $title = ($name -replace '^[0-9]+\s*-\s*','')
        $rel = "$name/leccion.txt"
        $dirFiles += [PSCustomObject]@{ Number=$num; Title=$title; RelPath=$rel }
    }
}

# Combinar y ordenar por Number (si Number==0, ordenar por title)
$all = @()
$all += $rootFiles
$all += $outputFiles
$all += $dirFiles
# Ordenar y eliminar duplicados. Prioriza archivos de la raíz sobre outputs cuando coinciden
$all = $all | Sort-Object @{Expression={$_.Number};Descending=$false}, @{Expression={$_.Title};Descending=$false}
$seen = @{}
$unique = @()
foreach($e in $all){
    $normTitle = ($e.Title -replace '\s+',' ' ).Trim().ToLower()
    $key = if($e.Number -gt 0){ "{0}|{1}" -f $e.Number, $normTitle } else { "0|$normTitle" }
    if(-not $seen.ContainsKey($key)){
        # si existen dos entradas con mismo número/título, preferir la que no esté en outputs
        $seen[$key] = $true
        $unique += $e
    }
}
$all = $unique

if(-not $all){ Write-Error 'No se encontraron lecciones.'; exit 1 }

# Escribir _INDICE.txt
$indicePath = Join-Path $root '_INDICE.txt'
$lines = @()
$lines += 'INDICE DE LECCIONES EVANGELISTICAS (generado automáticamente)'
$lines += "Generado: $(Get-Date -Format 'dd-MM-yyyy, HH:mm')"
$lines += ''
foreach($e in $all){
    $num = if($e.Number -gt 0){ $e.Number } else { '' }
    $lines += ("{0} - {1}" -f $num, $e.Title)
}

($lines -join "`r`n") | Out-File -FilePath $indicePath -Encoding utf8
Write-Host ("Escrito: {0} ({1} bytes)" -f $indicePath, (Get-ChildItem $indicePath).Length)

# Generar index.html estático
$indexPath = Join-Path $root 'index.html'
$html = @()
$html += '<!doctype html>'
$html += '<meta charset="utf-8">'
$html += '<title>Lecciones Bíblicas — Índice</title>'
$html += '<meta name="viewport" content="width=device-width,initial-scale=1">'
$html += '<style>body{font-family:system-ui,Segoe UI,Roboto,Arial;max-width:900px;margin:32px auto;padding:0 16px;color:#111}h1{font-size:1.6rem}ul{padding-left:1rem}li{margin:.35rem 0}a{color:#0b63d6;text-decoration:none}a:hover{text-decoration:underline}.small{font-size:.95rem;color:#555}.muted{color:#777;font-style:italic}</style>'
$html += '<h1>Lecciones Bíblicas</h1>'
$html += '<p class="small">Índice generado automáticamente.</p>'
$html += '<ul>'
foreach($e in $all){
    $display = if($e.Number -gt 0){ "{0} - {1}" -f $e.Number, $e.Title } else { $e.Title }
    $href = ($e.RelPath -replace '\\','/')
    $hrefEncoded = [uri]::EscapeUriString($href)
    $html += "  <li>$display <a href='$hrefEncoded' target='_blank'>Ver lección</a></li>"
}
$html += '</ul>'
$html += '<p class="muted">Si falta alguna lección, revisa que los archivos .txt estén en la raíz o en outputs/&lt;NNN - Título&gt;/leccion.txt</p>'

($html -join "`r`n") | Out-File -FilePath $indexPath -Encoding utf8
Write-Host ("Escrito: {0} ({1} bytes)" -f $indexPath, (Get-ChildItem $indexPath).Length)

Write-Host 'Generación completada. Ahora añade, commitea y push a origin/main.'
