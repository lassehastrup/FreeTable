function Get-MailboxCalendarAvailability {
    <#
    .SYNOPSIS
        Gets calendar availability for one or more users using Microsoft Graph getSchedule API.

    .DESCRIPTION
        Uses POST /me/calendar/getSchedule to fetch free/busy information for specified users.
        Returns availability status for the current day.

    .PARAMETER Emails
        Array of email addresses to check availability for.

    .PARAMETER AccessToken
        Bearer token for Microsoft Graph API authentication.

    .PARAMETER TimeZone
        The timezone for the schedule. Defaults to "Europe/Copenhagen".

    .EXAMPLE
        Get-MailboxCalendarAvailability -Emails "user@contoso.com" -AccessToken $token
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string[]]
        $Emails,

        [Parameter(Mandatory = $true)]
        [string]
        $AccessToken,

        [Parameter()]
        [string]
        $TimeZone = "Europe/Copenhagen"
    )

    process {
        $today = Get-Date
        $startOfDay = $today.Date.ToString("yyyy-MM-ddT00:00:00")
        $endOfDay = $today.Date.ToString("yyyy-MM-ddT23:59:59")

        $body = @{
            Schedules                = $Emails[0]
            StartTime                = @{
                dateTime = $startOfDay
                timeZone = $TimeZone
            }
            EndTime                  = @{
                dateTime = $endOfDay
                timeZone = $TimeZone
            }
            availabilityViewInterval = 60
        } | ConvertTo-Json -Depth 5

        $headers = @{
            "Authorization" = "Bearer $AccessToken"
            "Content-Type"  = "application/json"
        }

        try {
            $response = Invoke-RestMethod -Method POST `
                -Uri "https://graph.microsoft.com/v1.0/me/calendar/getSchedule" `
                -Headers $headers `
                -Body $body

            return $response.value
        }
        catch {
            Write-Error "Failed to get schedule: $_"
            return $null
        }
    }
}