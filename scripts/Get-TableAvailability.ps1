<#
.SYNOPSIS
    Fetches table availability based on Exchange Online calendar data.

.DESCRIPTION
    This script connects to Microsoft Graph API to check user calendars
    and determines if tables are available based on Out of Office status.

.PARAMETER LocationId
    The ID of the location to check (e.g., "aarhus", "Skanderborg")

.PARAMETER OutputPath
    Path where the JSON output will be saved

.EXAMPLE
    .\Get-TableAvailability.ps1 -LocationId "aarhus" -OutputPath "../client/public/data"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$LocationId,

    [Parameter(Mandatory = $false)]
    [string]$OutputPath = "../client/public/data"
)

# Ensure Microsoft.Graph module is available
function Ensure-GraphModule {
    if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Calendar)) {
        Write-Host "Installing Microsoft.Graph module..." -ForegroundColor Yellow
        Install-Module Microsoft.Graph -Scope CurrentUser -Force
    }
    Import-Module Microsoft.Graph.Calendar -ErrorAction Stop
    Import-Module Microsoft.Graph.Users -ErrorAction Stop
}

# Connect to Microsoft Graph
function Connect-ToGraph {
    $context = Get-MgContext
    if (-not $context) {
        Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Cyan
        Connect-MgGraph -Scopes "Calendars.Read", "User.Read.All"
    }
    else {
        Write-Host "Already connected as: $($context.Account)" -ForegroundColor Green
    }
}

# Check if user is Out of Office
function Get-UserAvailabilityStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$UserEmail
    )

    try {
        $today = Get-Date
        $startOfDay = $today.Date
        $endOfDay = $startOfDay.AddDays(1).AddSeconds(-1)

        # Get calendar events for today
        $events = Get-MgUserCalendarView -UserId $UserEmail `
            -StartDateTime $startOfDay.ToString("o") `
            -EndDateTime $endOfDay.ToString("o") `
            -Property "subject,showAs,start,end,isAllDay" `
            -ErrorAction Stop

        $now = Get-Date

        foreach ($event in $events) {
            $eventStart = [DateTime]::Parse($event.Start.DateTime)
            $eventEnd = [DateTime]::Parse($event.End.DateTime)

            # Check if event is currently active
            $isCurrentlyActive = ($now -ge $eventStart) -and ($now -le $eventEnd)

            # Check for Out of Office indicators
            $isOutOfOffice = ($event.ShowAs -eq "oof") -or
                            ($event.Subject -match "out of office|vacation|holiday|pto|ooo|ferie|fri")

            if (($isCurrentlyActive -or $event.IsAllDay) -and $isOutOfOffice) {
                return @{
                    IsOutOfOffice = $true
                    Status        = "available"
                    Reason        = $event.Subject
                }
            }
        }

        # User is in office (table is occupied)
        return @{
            IsOutOfOffice = $false
            Status        = "occupied"
            Reason        = $null
        }
    }
    catch {
        Write-Warning "Error checking availability for $UserEmail : $_"
        return @{
            IsOutOfOffice = $false
            Status        = "unknown"
            Reason        = "Unable to fetch calendar data"
        }
    }
}

# Load location configuration
function Get-LocationConfig {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LocationId
    )

    $configPath = Join-Path $PSScriptRoot "../locations/$LocationId/config.json"

    if (-not (Test-Path $configPath)) {
        throw "Location configuration not found: $configPath"
    }

    return Get-Content $configPath -Raw | ConvertFrom-Json
}

# Get all locations
function Get-AllLocations {
    $locationsPath = Join-Path $PSScriptRoot "../locations"
    $locations = @()

    Get-ChildItem -Path $locationsPath -Directory | ForEach-Object {
        $configPath = Join-Path $_.FullName "config.json"
        if (Test-Path $configPath) {
            $config = Get-Content $configPath -Raw | ConvertFrom-Json
            $locations += $config
        }
    }

    return $locations
}

# Main execution
function Main {
    Ensure-GraphModule
    Connect-ToGraph

    # Ensure output directory exists
    $fullOutputPath = Join-Path $PSScriptRoot $OutputPath
    if (-not (Test-Path $fullOutputPath)) {
        New-Item -ItemType Directory -Path $fullOutputPath -Force | Out-Null
    }

    $locationsToProcess = @()

    if ($LocationId) {
        $locationsToProcess += Get-LocationConfig -LocationId $LocationId
    }
    else {
        $locationsToProcess = Get-AllLocations
    }

    $allResults = @()

    foreach ($location in $locationsToProcess) {
        Write-Host "`nProcessing location: $($location.name)" -ForegroundColor Cyan

        $tablesWithAvailability = @()

        foreach ($table in $location.tables) {
            Write-Host "  Checking table $($table.id): $($table.name)..." -NoNewline

            if (-not $table.assignedUser) {
                $status = @{
                    IsOutOfOffice = $true
                    Status        = "available"
                    Reason        = "Unassigned table"
                }
            }
            else {
                $status = Get-UserAvailabilityStatus -UserEmail $table.assignedUser
            }

            $tableResult = @{
                id           = $table.id
                name         = $table.name
                assignedUser = $table.assignedUser
                status       = $status.Status
                isAvailable  = $status.IsOutOfOffice -or (-not $table.assignedUser)
                reason       = $status.Reason
                position     = $table.position
            }

            $tablesWithAvailability += $tableResult

            $statusColor = switch ($status.Status) {
                "available" { "Green" }
                "occupied" { "Red" }
                default { "Yellow" }
            }
            Write-Host " $($status.Status)" -ForegroundColor $statusColor
        }

        $locationResult = @{
            id        = $location.id
            name      = $location.name
            tables    = $tablesWithAvailability
            updatedAt = (Get-Date).ToString("o")
        }

        $allResults += $locationResult

        # Save individual location file
        $locationOutputFile = Join-Path $fullOutputPath "$($location.id).json"
        $locationResult | ConvertTo-Json -Depth 10 | Set-Content $locationOutputFile -Encoding UTF8
        Write-Host "  Saved to: $locationOutputFile" -ForegroundColor Gray
    }

    # Save combined locations index
    $indexFile = Join-Path $fullOutputPath "locations.json"
    $allResults | ConvertTo-Json -Depth 10 | Set-Content $indexFile -Encoding UTF8
    Write-Host "`nSaved locations index to: $indexFile" -ForegroundColor Green

    return $allResults
}

# Run the script
Main
