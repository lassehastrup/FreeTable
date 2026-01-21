function Get-GraphAccessToken {
    <#
    .SYNOPSIS
        Gets a Microsoft Graph access token using Azure PowerShell.

    .DESCRIPTION
        Uses Get-AzAccessToken to retrieve a bearer token for Microsoft Graph API.

    .EXAMPLE
        $token = Get-GraphAccessToken
    #>
    [CmdletBinding()]
    param ()

    process {
        try {
            $tokenResponse = Get-AzAccessToken -ResourceUrl "https://graph.microsoft.com"
            $plainTextToken = $tokenResponse.Token | ConvertFrom-SecureString -AsPlainText

            return $plainTextToken
        }
        catch {
            Write-Error "Failed to get access token: $_"
            throw
        }
    }
}
