function Get-TableAvailabilityStatus {
    <#
    .SYNOPSIS
        Determines availability status for tables based on schedule data.

    .DESCRIPTION
        Takes tables and schedule lookup, determines if each table is available
        based on the assigned user's calendar status.

    .PARAMETER Tables
        Array of table objects from the location config.

    .PARAMETER ScheduleLookup
        Hashtable with email (lowercase) as key and schedule object as value.

    .EXAMPLE
        $updatedTables = Get-TableAvailabilityStatus -Tables $tables -ScheduleLookup $scheduleLookup
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [array]
        $Tables,

        [Parameter(Mandatory)]
        [hashtable]
        $ScheduleLookup
    )

    process {
        foreach ($table in $Tables) {
            Write-Information "  Processing table: $($table.id) - $($table.name)..."

            if (-not $table.assignedUser) {
                # Unassigned tables are always available
                Write-Information "    -> available (unassigned)"

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
                # Get schedule for this user
                $schedule = $ScheduleLookup[$table.assignedUser.ToLower()]

                if ($schedule) {
                    # Determine if the user is available
                    $tableStatus = ConvertTo-TableStatus -Schedule $schedule

                    Write-Information "    -> $($tableStatus.Status)"

                    [PSCustomObject]@{
                        id           = $table.id
                        name         = $table.name
                        assignedUser = $table.assignedUser
                        position     = $table.position
                        status       = $tableStatus.Status
                        isAvailable  = $tableStatus.IsAvailable
                        reason       = $tableStatus.Reason
                    }
                }
                else {
                    Write-Information "    -> unknown (no schedule data)"

                    [PSCustomObject]@{
                        id           = $table.id
                        name         = $table.name
                        assignedUser = $table.assignedUser
                        position     = $table.position
                        status       = "unknown"
                        isAvailable  = $false
                        reason       = "Could not fetch calendar data"
                    }
                }
            }
        }
    }
}
