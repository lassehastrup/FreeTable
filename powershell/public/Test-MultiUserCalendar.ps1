function Test-MultiUserCalendar {
    <#
    .SYNOPSIS
        Test function to check table availability for multiple users from config.

    .PARAMETER MaxUsers
        Maximum number of users to test. Default is 10.

    .EXAMPLE
        Test-MultiUserCalendar
        Test-MultiUserCalendar -MaxUsers 5
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [int]$MaxUsers = 10
    )

    process {
        # Load config and get emails
        $configPath = Join-Path $PSScriptRoot "..\..\locations\aarhus\config.json"
        $config = Get-Content $configPath -Raw | ConvertFrom-Json

        # Extract all assigned users from all zones (first N with emails)
        $allUsers = $config.zones | ForEach-Object {
            $_.tables | Where-Object { $_.assignedUser -and $_.assignedUser -ne "" }
        } | Select-Object -First $MaxUsers

        Write-Host "`nTesting $($allUsers.Count) users from Aarhus config..." -ForegroundColor Cyan
        Write-Host ("=" * 60) -ForegroundColor Gray

        $today = Get-Date
        $startDateTime = $today.Date.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        $endDateTime = $today.Date.AddDays(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        $now = Get-Date

        $headers = Get-MGGraphHeaders
        # Store results
        $results = @()

        foreach ($user in $allUsers) {
            $email = $user.assignedUser
            $userName = $user.assignedUserName
            $tableId = $user.id

            Write-Information "`nChecking: $userName ($email) - $tableId"

            try {
                $uri = "https://graph.microsoft.com/v1.0/users/$email/calendar/calendarView?startDateTime=$startDateTime&endDateTime=$endDateTime"
                $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method GET

                # Convert events
                $appointments = $response.value | ForEach-Object {
                    [PSCustomObject]@{
                        Subject         = $_.subject
                        Start           = [DateTime]$_.start.dateTime
                        End             = [DateTime]$_.end.dateTime
                        Location        = $_.location.displayName
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

                # Determine table availability
                $isTableAvailable = $false
                $reason = "At desk (no blocking events)"

                # Check for all-day OOF events first
                $allDayOofEvents = $appointments | Where-Object {
                    $_.IsAllDay -eq $true -and
                    $_.ShowAs -in @("oof", "workingElsewhere") -and
                    -not $_.IsCancelled
                }

                if ($allDayOofEvents.Count -gt 0) {
                    $isTableAvailable = $true
                    $reason = "All-day absence: $($allDayOofEvents[0].Subject)"
                }
                elseif ($currentEvents.Count -gt 0) {
                    foreach ($event in $currentEvents) {
                        if ($event.ShowAs -eq "oof") {
                            $isTableAvailable = $true
                            $reason = "Out of Office: $($event.Subject)"
                            break
                        }
                        elseif ($event.ShowAs -eq "workingElsewhere") {
                            $isTableAvailable = $true
                            $reason = "Working Elsewhere: $($event.Subject)"
                            break
                        }
                        elseif ($event.IsOnlineMeeting -eq $true) {
                            $isTableAvailable = $false
                            $reason = "In online meeting: $($event.Subject)"
                        }
                        elseif ($event.ShowAs -in @("busy", "tentative")) {
                            $isTableAvailable = $false
                            $reason = "Busy: $($event.Subject)"
                        }
                    }
                }

                # Display result
                $statusColor = if ($isTableAvailable) { "Green" } else { "Red" }
                $statusText = if ($isTableAvailable) { "AVAILABLE" } else { "OCCUPIED" }
                Write-Host "  Table: $statusText - $reason" -ForegroundColor $statusColor

                $results += [PSCustomObject]@{
                    TableId          = $tableId
                    UserName         = $userName
                    Email            = $email
                    IsTableAvailable = $isTableAvailable
                    Reason           = $reason
                    EventCount       = $appointments.Count
                    CurrentEvents    = $currentEvents.Count
                }
            }
            catch {
                Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
                $results += [PSCustomObject]@{
                    TableId          = $tableId
                    UserName         = $userName
                    Email            = $email
                    IsTableAvailable = $null
                    Reason           = "Error: $($_.Exception.Message)"
                    EventCount       = 0
                    CurrentEvents    = 0
                }
            }
        }

        # Summary
        Write-Host ("`n" + "=" * 60) -ForegroundColor Gray
        Write-Host "SUMMARY" -ForegroundColor Cyan
        Write-Host ("=" * 60) -ForegroundColor Gray

        $available = ($results | Where-Object { $_.IsTableAvailable -eq $true }).Count
        $occupied = ($results | Where-Object { $_.IsTableAvailable -eq $false }).Count
        $errors = ($results | Where-Object { $_.IsTableAvailable -eq $null }).Count

        Write-Host "Available tables: $available" -ForegroundColor Green
        Write-Host "Occupied tables:  $occupied" -ForegroundColor Red
        Write-Host "Errors:           $errors" -ForegroundColor Yellow

        Write-Host "`nDetailed Results:" -ForegroundColor Cyan
        $results | Format-Table TableId, UserName, IsTableAvailable, Reason -AutoSize

        # Return results
        $results
    }
}
