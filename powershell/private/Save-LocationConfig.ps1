function Save-LocationConfig {
    <#
    .SYNOPSIS
        Saves a location configuration back to its config.json file.

    .PARAMETER ConfigPath
        Path to the config.json file.

    .PARAMETER Config
        The configuration object to save.

    .EXAMPLE
        Save-LocationConfig -ConfigPath "./locations/aarhus/config.json" -Config $config
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]
        $ConfigPath,

        [Parameter(Mandatory = $true)]
        $Config
    )

    process {
        $Config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath -Encoding UTF8
        Write-Verbose "Updated: $ConfigPath"
    }
}
