function Get-LocationUserMailbox {
    [CmdletBinding()]
    param (
        [Parameter()]
        [string]
        $officeLocation
    )
    $configPath = (Get-OfficeLocations -officeLocation $officeLocation).ConfigPath
    $configContent = Get-Content $configPath | ConvertFrom-Json

    foreach ($table in $configContent.tables) {

        Write-Information "Processing $table | Out-string"

    }

}