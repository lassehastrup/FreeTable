function Get-LocationConfig {
    <#
    .SYNOPSIS
        Gets the configuration content for a location.

    .PARAMETER ConfigPath
        Path to the config.json file.

    .EXAMPLE
        $config = Get-LocationConfig -ConfigPath "./locations/aarhus/config.json"
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]
        $ConfigPath
    )

    process {
        if (-not (Test-Path $ConfigPath)) {
            throw "Configuration not found: $ConfigPath"
        }

        Get-Content $ConfigPath -Raw | ConvertFrom-Json
    }
}
