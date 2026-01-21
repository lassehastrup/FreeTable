function ConvertTo-TableStatus {
    <#
    .SYNOPSIS
        Converts a Graph schedule response to table availability status.

    .PARAMETER Schedule
        The schedule object from getSchedule API response.

    .EXAMPLE
        $status = ConvertTo-TableStatus -Schedule $scheduleItem
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        $Schedule
    )

    process {
        $availabilityView = $Schedule.availabilityView
        $scheduleItems = $Schedule.scheduleItems

        # Get current hour's availability
        $currentHour = [int](Get-Date -Format "HH")
        $currentAvailability = if ($availabilityView.Length -gt $currentHour) {
            $availabilityView[$currentHour]
        }
        else {
            "0"
        }

        # availabilityView codes: 0=free, 1=tentative, 2=busy, 3=oof, 4=workingElsewhere
        $isOutOfOffice = $currentAvailability -eq "3"

        $status = switch ($currentAvailability) {
            "0" { "free" }
            "1" { "tentative" }
            "2" { "busy" }
            "3" { "oof" }
            "4" { "workingElsewhere" }
            default { "unknown" }
        }

        # Check for OOF event subject
        $oofEvent = $scheduleItems | Where-Object { $_.status -eq "oof" } | Select-Object -First 1

        [PSCustomObject]@{
            Email         = $Schedule.scheduleId
            Status        = $status
            IsOutOfOffice = $isOutOfOffice
            IsAvailable   = $isOutOfOffice
            Reason        = if ($oofEvent) { $oofEvent.subject } else { $null }
        }
    }
}
