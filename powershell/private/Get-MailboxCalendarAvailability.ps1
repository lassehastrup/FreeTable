function Get-MailboxCalendarAvailability {
    <#
    .SYNOPSIS
        Gets calendar availability for one or more users using Microsoft Graph calendarView API.

    .DESCRIPTION
        Uses GET /users/{email}/calendar/calendarView to fetch calendar events for specified users.
        Returns availability status for the current day.

    .PARAMETER Emails
        Array of email addresses to check availability for.

    .PARAMETER Headers
        Hashtable containing Authorization and Content-Type headers for Microsoft Graph API.

    .PARAMETER TimeZone
        The timezone for the schedule. Defaults to "Europe/Copenhagen".

    .EXAMPLE
        $headers = Get-MGGraphHeaders
        Get-MailboxCalendarAvailability -Emails "user@contoso.com" -Headers $headers
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string[]]
        $Emails,

        [Parameter(Mandatory = $true)]
        [hashtable]
        $Headers,

        [Parameter()]
        [string]
        $TimeZone = "Europe/Copenhagen"
    )

    process {
        $today = Get-Date
        $startDateTime = $today.Date.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        $endDateTime = $today.Date.AddDays(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

        $results = @()

        foreach ($email in $Emails) {
            try {
                Write-Information "  Fetching calendar for $email..."

                $uri = "https://graph.microsoft.com/v1.0/users/$email/calendar/calendarView?startDateTime=$startDateTime&endDateTime=$endDateTime"
                $response = Invoke-RestMethod -Uri $uri -Headers $Headers -Method GET

                $results += [PSCustomObject]@{
                    scheduleId    = $email
                    calendarEvents = $response.value
                }
            }
            catch {
                Write-Warning "Failed to get calendar for $email : $_"
                $results += [PSCustomObject]@{
                    scheduleId    = $email
                    calendarEvents = @()
                    error         = $_.Exception.Message
                }
            }
        }

        return $results
    }
}
