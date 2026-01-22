<#
.SYNOPSIS
    Main orchestration script for updating table availability.

.DESCRIPTION
    Workflow:
    1. Get Locations (Get-OfficeLocations)
    2. Get Users (Get-LocationConfig)
    3. Foreach user:
        - Get mailbox data (Get-MailboxCalendarAvailability)
        - Figure out if the user is available or not (ConvertTo-TableStatus)
        - Store result
    4. Update the config JSON files with the latest data (Save-LocationConfig)

.PARAMETER LocationId
    Optional. The ID of a specific location to process (e.g., "aarhus").
    If not specified, all locations will be processed.

.PARAMETER TimeZone
    The timezone to use for availability checks. Default is "Europe/Copenhagen".

.EXAMPLE
    .\Update-TableConfiguration.ps1
    .\Update-TableConfiguration.ps1 -LocationId "aarhus"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$LocationId,

    [Parameter(Mandatory = $false)]
    [string]$TimeZone = "Europe/Copenhagen"
)

# Import the FreeTable module
$modulePath = Join-Path $PSScriptRoot "freetable.psm1"
Import-Module $modulePath -Force

#region Step 1: Get Locations
Write-Information "Step 1: Getting locations..."
$locations = Get-OfficeLocations -officeLocation $LocationId

if (-not $locations) {
    Write-Error "No locations found"
    exit 1
}

Write-Information "Found $(@($locations).Count) location(s)"
#endregion

#region Get Graph Headers (once)
Write-Information "Getting Microsoft Graph headers..."
$graphHeaders = Get-MGGraphHeaders

if (-not $graphHeaders) {
    Write-Error "Failed to get Graph headers"
    exit 1
}
Write-Information "  Graph headers acquired"
#endregion

#region Process each location
foreach ($location in $locations) {
    Write-Information ""
    Write-Information "========================================"
    Write-Information "Processing location: $($location.Name)"
    Write-Information "========================================"

    #region Step 2: Get Users
    Write-Information "Step 2: Getting users for location..."
    $config = Get-LocationConfig -ConfigPath $location.ConfigPath

    # Config uses zones structure - collect all tables from all zones
    $allTables = @()
    foreach ($zone in $config.zones) {
        $allTables += $zone.tables
    }

    $usersWithMailbox = $allTables | Where-Object { $_.assignedUser }

    Write-Information "  Found $(@($allTables).Count) table(s) across $(@($config.zones).Count) zone(s), $(@($usersWithMailbox).Count) with assigned users"

    if ($usersWithMailbox.Count -eq 0) {
        Write-Information "  No assigned users found, skipping location..."
        continue
    }
    #endregion

    #region Step 3-6: Foreach user - Get mailbox data, determine availability, store result
    Write-Information "Step 3-6: Processing each user..."

    $emails = $usersWithMailbox | ForEach-Object { $_.assignedUser }

    # Step 4: Get mailbox data for all users
    Write-Information "  Fetching calendar availability for $(@($emails).Count) user(s)..."
    $schedules = Get-MailboxCalendarAvailability -Emails $emails -Headers $graphHeaders -TimeZone $TimeZone

    if (-not $schedules) {
        Write-Information "  Failed to fetch availability data"
        continue
    }

    # Build lookup by email for quick access
    $scheduleLookup = @{}
    foreach ($schedule in $schedules) {
        $scheduleLookup[$schedule.scheduleId.ToLower()] = $schedule
    }

    # Step 5-6: Determine availability and store results per zone
    Write-Information "Step 5-6: Determining availability for each table..."

    foreach ($zone in $config.zones) {
        Write-Information "  Processing zone: $($zone.name)..."
        $updatedTables = Get-TableAvailabilityStatus -Tables $zone.tables -ScheduleLookup $scheduleLookup
        $zone.tables = $updatedTables
    }
    #endregion

    #region Step 7: Update the config JSON files
    Write-Information "Step 7: Updating config file..."

    # Add or update lastUpdated property
    $config | Add-Member -NotePropertyName "lastUpdated" -NotePropertyValue (Get-Date).ToString("o") -Force

    Save-LocationConfig -ConfigPath $location.ConfigPath -Config $config

    Write-Information "  Config saved: $($location.ConfigPath)"
    #endregion
}
#endregion

Write-Information ""
Write-Information "========================================"
Write-Information "Update complete!"
Write-Information "========================================"
