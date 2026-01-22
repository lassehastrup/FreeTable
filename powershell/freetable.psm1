# Dot source private and public functions
$privatePath = Join-Path $PSScriptRoot "private"
$publicPath = Join-Path $PSScriptRoot "public"

$srcFiles = @()
$srcFiles += Get-ChildItem -Path $privatePath -Filter "*.ps1" -ErrorAction 'SilentlyContinue'
$srcFiles += Get-ChildItem -Path $publicPath -Filter "*.ps1" -ErrorAction 'SilentlyContinue'

foreach ($file in $srcFiles) {
    try {
        . $file.FullName
    }
    catch {
        throw "Unable to dot source $($file.FullName)"
    }
}