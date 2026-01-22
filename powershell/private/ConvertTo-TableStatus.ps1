function ConvertTo-TableStatus {
    <#
    .SYNOPSIS
        Converts calendar events to table availability status.

    .PARAMETER Schedule
        The schedule object containing calendarEvents from calendarView API response.

    .EXAMPLE
        $status = ConvertTo-TableStatus -Schedule $scheduleItem
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        $Schedule
    )

    process {
        $now = Get-Date
        $calendarEvents = $Schedule.calendarEvents

        # Convert events to usable objects
        $appointments = $calendarEvents | ForEach-Object {
            [PSCustomObject]@{
                Subject         = $_.subject
                Start           = [DateTime]$_.start.dateTime
                End             = [DateTime]$_.end.dateTime
                IsAllDay        = $_.isAllDay
                ShowAs          = $_.showAs
                IsOnlineMeeting = $_.isOnlineMeeting
                IsCancelled     = $_.isCancelled
            }
        }

        # Get events happening right now
        $currentEvents = $appointments | Where-Object {
            -not $_.IsCancelled -and
            $_.Start -le $now -and
            $_.End -gt $now
        }

        # Default: not available (at desk)
        $isTableAvailable = $false
        $status = "busy"
        $reason = "At desk (no blocking events)"

        # Check for all-day OOF events first
        $allDayOofEvents = $appointments | Where-Object {
            $_.IsAllDay -eq $true -and
            $_.ShowAs -in @("oof", "workingElsewhere") -and
            -not $_.IsCancelled
        }

        if ($allDayOofEvents.Count -gt 0) {
            $isTableAvailable = $true
            $status = $allDayOofEvents[0].ShowAs
            $reason = "All-day absence: $($allDayOofEvents[0].Subject)"
        }
        elseif ($currentEvents.Count -gt 0) {
            foreach ($event in $currentEvents) {
                if ($event.ShowAs -eq "oof") {
                    $isTableAvailable = $true
                    $status = "oof"
                    $reason = "Out of Office: $($event.Subject)"
                    break
                }
                elseif ($event.ShowAs -eq "workingElsewhere") {
                    $isTableAvailable = $true
                    $status = "workingElsewhere"
                    $reason = "Working Elsewhere: $($event.Subject)"
                    break
                }
                elseif ($event.IsOnlineMeeting -eq $true) {
                    $isTableAvailable = $false
                    $status = "busy"
                    $reason = "In online meeting: $($event.Subject)"
                }
                elseif ($event.ShowAs -in @("busy", "tentative")) {
                    $isTableAvailable = $false
                    $status = $event.ShowAs
                    $reason = "Busy: $($event.Subject)"
                }
            }
        }
        else {
            # No current events - user is at desk, table not available
            $isTableAvailable = $false
            $status = "atDesk"
            $reason = "At desk"
        }

        [PSCustomObject]@{
            Email       = $Schedule.scheduleId
            Status      = $status
            IsAvailable = $isTableAvailable
            Reason      = $reason
        }
    }
}
