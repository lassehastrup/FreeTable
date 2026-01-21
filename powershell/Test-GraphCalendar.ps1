<#
.SYNOPSIS
    Test function to debug Graph API calendar access.
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Email = "lasse.hastrup@fellowmind.dk"
)

$tenantId = "057ea9a3-ad57-4c97-bf75-ad494ec38d64"
$clientId = "<app-client-id>"

# -ClientId $clientId
Connect-MgGraph -TenantId $tenantId  -Scopes "Calendars.Read"

# Get access token
Write-Host "Getting access token..." -ForegroundColor Cyan
$tokenResponse = Get-AzAccessToken -ResourceUrl "https://graph.microsoft.com"
$token = $tokenResponse.Token | ConvertFrom-SecureString -AsPlainText

Write-Host "Token length: $($token.Length)" -ForegroundColor Gray
Write-Host "Token starts with: $($token.Substring(0, 50))..." -ForegroundColor Gray

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# Test 1: Get my own profile
Write-Host "`n=== Test 1: Get /me ===" -ForegroundColor Yellow
try {
    $me = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/me" -Headers $headers
    Write-Host "Success! Logged in as: $($me.displayName) ($($me.mail))" -ForegroundColor Green
}
catch {
    Write-Host "Failed: $_" -ForegroundColor Red
}

# Test 2: Get my own calendar events
Write-Host "`n=== Test 2: Get my calendar events ===" -ForegroundColor Yellow
try {
    $startDate = (Get-Date).Date.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $endDate = (Get-Date).Date.AddDays(1).AddSeconds(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $events = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=$startDate&endDateTime=$endDate" -Headers $headers
    Write-Host "Success! Found $($events.value.Count) events today" -ForegroundColor Green
}
catch {
    Write-Host "Failed: $_" -ForegroundColor Red
}

# Test 3: getSchedule for myself
Write-Host "`n=== Test 3: getSchedule for myself ===" -ForegroundColor Yellow
$today = Get-Date
$body = @{
    Schedules = @($Email)
    StartTime = @{
        dateTime = $today.Date.ToString("yyyy-MM-ddT00:00:00")
        timeZone = "Europe/Copenhagen"
    }
    EndTime = @{
        dateTime = $today.Date.ToString("yyyy-MM-ddT23:59:59")
        timeZone = "Europe/Copenhagen"
    }
    availabilityViewInterval = 60
} | ConvertTo-Json -Depth 5

try {
    $schedule = Invoke-RestMethod -Method POST -Uri "https://graph.microsoft.com/v1.0/me/calendar/getSchedule" -Headers $headers -Body $body
    Write-Host "Success!" -ForegroundColor Green
    $schedule.value | ForEach-Object {
        Write-Host "  $($_.scheduleId): $($_.availabilityView)" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

# Test 4: Try findMeetingTimes instead (different permission)
Write-Host "`n=== Test 4: Check required scopes in token ===" -ForegroundColor Yellow
try {
    # Decode JWT to see scopes
    $tokenParts = $token.Split('.')
    $payload = $tokenParts[1]
    # Add padding if needed
    $padding = 4 - ($payload.Length % 4)
    if ($padding -ne 4) {
        $payload += ('=' * $padding)
    }
    $decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload))
    $claims = $decoded | ConvertFrom-Json
    Write-Host "Audience: $($claims.aud)" -ForegroundColor Cyan
    Write-Host "Scopes: $($claims.scp)" -ForegroundColor Cyan
}
catch {
    Write-Host "Could not decode token: $_" -ForegroundColor Yellow
}

# Test 5: Try with a colleague
Write-Host "`n=== Test 5: getSchedule for colleague ===" -ForegroundColor Yellow
$colleagueEmail = "stephan.fuhlendorff@fellowmind.dk"
$body = @{
    Schedules = @($colleagueEmail)
    StartTime = @{
        dateTime = $today.Date.ToString("yyyy-MM-ddT00:00:00")
        timeZone = "Europe/Copenhagen"
    }
    EndTime = @{
        dateTime = $today.Date.ToString("yyyy-MM-ddT23:59:59")
        timeZone = "Europe/Copenhagen"
    }
    availabilityViewInterval = 60
} | ConvertTo-Json -Depth 5

try {
    $schedule = Invoke-RestMethod -Method POST -Uri "https://graph.microsoft.com/v1.0/me/calendar/getSchedule" -Headers $headers -Body $body
    Write-Host "Success!" -ForegroundColor Green
    $schedule.value | ForEach-Object {
        Write-Host "  $($_.scheduleId): $($_.availabilityView)" -ForegroundColor Cyan
        if ($_.error) {
            Write-Host "  Error: $($_.error.message)" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Yellow
