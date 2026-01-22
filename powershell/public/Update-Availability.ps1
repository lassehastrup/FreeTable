function Update-Availability {
    <#
    .SYNOPSIS
        Scheduled task wrapper for updating table availability.

    .DESCRIPTION
        This function is designed to be run as a scheduled task to periodically
        update the table availability data.

    .PARAMETER Interval
        How often to refresh (in minutes). Default is 5 minutes.

    .PARAMETER RunOnce
        If specified, runs once and exits instead of continuous loop.

    .EXAMPLE
        Update-Availability -RunOnce
        Update-Availability -Interval 10
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [int]$Interval = 5,

        [Parameter(Mandatory = $false)]
        [switch]$RunOnce
    )

    process {
        function Update {
            Write-Host "`n$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Updating availability..." -ForegroundColor Cyan
            Get-TableAvailability
        }

        if ($RunOnce) {
            Update
        }
        else {
            Write-Host "Starting availability update loop (every $Interval minutes)" -ForegroundColor Green
            Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

            while ($true) {
                Update
                Write-Host "`nNext update in $Interval minutes..." -ForegroundColor Gray
                Start-Sleep -Seconds ($Interval * 60)
            }
        }
    }
}
