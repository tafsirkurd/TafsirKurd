# Setup Zceer Scheduled Tasks
Write-Host "Setting up automatic zceer tasks..." -ForegroundColor Cyan
Write-Host ""

# Delete old tasks
Write-Host "Removing old tasks..." -ForegroundColor Yellow
$oldTasks = @(
    "TafsirKurd Zceer Morning",
    "TafsirKurd Zceer Afternoon",
    "TafsirKurd Zceer Evening",
    "Tafsir Kurd - Random Zceer Morning",
    "Tafsir Kurd - Random Zceer Afternoon",
    "Tafsir Kurd - Random Zceer Evening"
)

foreach ($task in $oldTasks) {
    Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Creating new tasks..." -ForegroundColor Green
Write-Host ""

# Morning task (8 AM)
Write-Host "[1/3] Creating Morning Zceer task (8:00 AM)..." -ForegroundColor White
$action = New-ScheduledTaskAction -Execute 'C:\TafsirKurd\send-random-zceer.bat' -WorkingDirectory 'C:\TafsirKurd'
$trigger = New-ScheduledTaskTrigger -Daily -At 08:00
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest
Register-ScheduledTask -TaskName 'TafsirKurd Zceer Morning' -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Write-Host "   SUCCESS: Morning task created" -ForegroundColor Green

# Afternoon task (2 PM)
Write-Host "[2/3] Creating Afternoon Zceer task (2:00 PM)..." -ForegroundColor White
$action = New-ScheduledTaskAction -Execute 'C:\TafsirKurd\send-random-zceer.bat' -WorkingDirectory 'C:\TafsirKurd'
$trigger = New-ScheduledTaskTrigger -Daily -At 14:00
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest
Register-ScheduledTask -TaskName 'TafsirKurd Zceer Afternoon' -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Write-Host "   SUCCESS: Afternoon task created" -ForegroundColor Green

# Evening task (8 PM)
Write-Host "[3/3] Creating Evening Zceer task (8:00 PM)..." -ForegroundColor White
$action = New-ScheduledTaskAction -Execute 'C:\TafsirKurd\send-random-zceer.bat' -WorkingDirectory 'C:\TafsirKurd'
$trigger = New-ScheduledTaskTrigger -Daily -At 20:00
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest
Register-ScheduledTask -TaskName 'TafsirKurd Zceer Evening' -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Write-Host "   SUCCESS: Evening task created" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You will now receive automatic zceer at:" -ForegroundColor Yellow
Write-Host "  - Morning:   8:00 AM daily" -ForegroundColor White
Write-Host "  - Afternoon: 2:00 PM daily" -ForegroundColor White
Write-Host "  - Evening:   8:00 PM daily" -ForegroundColor White
Write-Host ""
Write-Host "Next scheduled times:" -ForegroundColor Yellow
$morning = Get-ScheduledTaskInfo -TaskName "TafsirKurd Zceer Morning"
$afternoon = Get-ScheduledTaskInfo -TaskName "TafsirKurd Zceer Afternoon"
$evening = Get-ScheduledTaskInfo -TaskName "TafsirKurd Zceer Evening"
Write-Host "  - Morning:   $($morning.NextRunTime)" -ForegroundColor White
Write-Host "  - Afternoon: $($afternoon.NextRunTime)" -ForegroundColor White
Write-Host "  - Evening:   $($evening.NextRunTime)" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
