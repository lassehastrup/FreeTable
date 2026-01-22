function Get-TableAvailability {
    <#
    .SYNOPSIS
        Fetches table availability based on Exchange Online calendar data.

    .DESCRIPTION
        Uses Microsoft Graph getSchedule API to check user availability
        and updates the location config files in-place.

    .PARAMETER LocationId
        The ID of the location to check (e.g., "aarhus", "skanderborg").
        If not specified, all locations will be processed.

    .PARAMETER AccessToken
        Bearer token for Microsoft Graph API. If not provided, will attempt
        to get one using Get-AzAccessToken.

    .PARAMETER TimeZone
        The timezone to use for availability checks. Default is "Europe/Copenhagen".

    .EXAMPLE
        Get-TableAvailability
        Get-TableAvailability -LocationId "aarhus"
        Get-TableAvailability -AccessToken $token
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$LocationId,

        [Parameter(Mandatory = $false)]
        [string]$AccessToken,

        [Parameter(Mandatory = $false)]
        [string]$TimeZone = "Europe/Copenhagen"
    )

    process {
        # Get access token if not provided
        if (-not $AccessToken) {
            Write-Host "Getting access token..." -ForegroundColor Cyan
            $AccessToken = Get-GraphAccessToken
        }

        Write-Host "Using access token for Microsoft Graph API" -ForegroundColor Green

        # Get locations to process
        $locations = Get-OfficeLocations -officeLocation $LocationId

        foreach ($location in $locations) {
            Write-Host "`nProcessing location: $($location.Name)" -ForegroundColor Cyan

            $config = Get-LocationConfig -ConfigPath $location.ConfigPath

            # Collect emails from tables
            $emails = $config.tables | Where-Object { $_.assignedUser } | ForEach-Object { $_.assignedUser }

            if ($emails.Count -eq 0) {
                Write-Host "  No assigned users found, skipping..." -ForegroundColor Yellow
                continue
            }

            # Fetch availability for all users
            Write-Host "  Checking availability for $($emails.Count) user(s)..." -ForegroundColor Gray
            $schedules = Get-MailboxCalendarAvailability -Emails $emails -AccessToken $AccessToken -TimeZone $TimeZone

            if (-not $schedules) {
                Write-Host "  Failed to fetch availability" -ForegroundColor Red
                continue
            }

            # Build lookup by email
            $scheduleLookup = @{}
            foreach ($schedule in $schedules) {
                $scheduleLookup[$schedule.scheduleId.ToLower()] = $schedule
            }

            # Update tables with availability
            $updatedTables = foreach ($table in $config.tables) {
                Write-Host "  Table $($table.id): $($table.name)..." -NoNewline

                if (-not $table.assignedUser) {
                    Write-Host " available (unassigned)" -ForegroundColor Green
                    [PSCustomObject]@{
                        id           = $table.id
                        name         = $table.name
                        assignedUser = $table.assignedUser
                        position     = $table.position
                        status       = "available"
                        isAvailable  = $true
                        reason       = "Unassigned table"
                    }
                }
                else {
                    $schedule = $scheduleLookup[$table.assignedUser.ToLower()]

                    if ($schedule) {
                        $tableStatus = ConvertTo-TableStatus -Schedule $schedule

                        $statusColor = if ($tableStatus.IsAvailable) { "Green" } else { "Red" }
                        $displayStatus = if ($tableStatus.IsAvailable) { "available" } else { "occupied" }
                        Write-Host " $displayStatus" -ForegroundColor $statusColor

                        [PSCustomObject]@{
                            id           = $table.id
                            name         = $table.name
                            assignedUser = $table.assignedUser
                            position     = $table.position
                            status       = $displayStatus
                            isAvailable  = $tableStatus.IsAvailable
                            reason       = $tableStatus.Reason
                        }
                    }
                    else {
                        Write-Host " unknown" -ForegroundColor Yellow
                        [PSCustomObject]@{
                            id           = $table.id
                            name         = $table.name
                            assignedUser = $table.assignedUser
                            position     = $table.position
                            status       = "unknown"
                            isAvailable  = $false
                            reason       = "Could not fetch availability"
                        }
                    }
                }
            }

            # Save updated config
            $updatedConfig = [PSCustomObject]@{
                id             = $config.id
                name           = $config.name
                floorPlanImage = $config.floorPlanImage
                tables         = $updatedTables
                updatedAt      = (Get-Date).ToString("o")
            }

            Save-LocationConfig -ConfigPath $location.ConfigPath -Config $updatedConfig
            Write-Host "  Saved: $($location.ConfigPath)" -ForegroundColor Gray
        }

        Write-Host "`nAvailability update complete!" -ForegroundColor Green
    }
}
