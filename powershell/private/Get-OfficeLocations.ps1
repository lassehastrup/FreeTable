function Get-OfficeLocations {
    [CmdletBinding()]
    param (
        [Parameter()]
        [string]
        $officeLocation
    )

    $rootPath = $PSScriptRoot

    if ($officeLocation) {
        $locationsFolderPath = "$rootPath/../../locations/$officeLocation"
        Test-Path "$locationsFolderPath/config.json" -ErrorAction Stop | Out-Null
        return [PSCustomObject]@{
            Name       = $officeLocation
            ConfigPath = "$locationsFolderPath/config.json"
        }
    }

    $locationsFolderPath = "$rootPath/../../locations"
    $locationsFolderItems = Get-ChildItem $locationsFolderPath -Directory

    foreach ($location in $locationsFolderItems) {
        $configPath = "$($location.FullName)/config.json"
        if (Test-Path $configPath) {
            [PSCustomObject]@{
                Name       = $location.Name
                ConfigPath = $configPath
            }
        }
    }
}