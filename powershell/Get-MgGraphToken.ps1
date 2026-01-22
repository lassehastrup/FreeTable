function Get-MGGraphHeaders {
    [CmdletBinding()]
    param (
        [Parameter()]
        [string]
        $appId = '4d125c63-9a3d-438f-a058-3bbbda50fc9d',

        [Parameter()]
        [string]
        $tenantId = 'c905c127-525f-47a9-83f1-bec014f6d613'
    )

    $appId = security find-generic-password -a "FreeTable" -s "ClientId" -w
    $secret = security find-generic-password -a "FreeTable" -s "ClientSecret" -w
    $tenantId = security find-generic-password -a "FreeTable" -s "TenantId" -w

    Write-Debug "Preparing to get access token for appId: $appId in tenantId: $tenantId"
    $body = @{
        Grant_Type    = "client_credentials"
        Scope         = "https://graph.microsoft.com/.default"
        Client_Id     = $appId
        Client_Secret = $secret
    }

    $connectionSplat = @{
        Uri    = "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token"
        Method = "POST"
        Body   = $body
    }
    $connection = Invoke-RestMethod @connectionSplat

    $token = $connection.access_token

    Write-Debug "Getting access token..."
    Write-Debug "Token length: $($token.Length)"

    return @{
        "Authorization" = "Bearer $token"
        "Content-Type"  = "application/json"
    }
}