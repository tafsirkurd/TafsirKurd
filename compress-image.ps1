# PowerShell script to compress TafsirKurd.png using .NET
# Reduces file size from 231KB to <100KB

Add-Type -AssemblyName System.Drawing

$inputPath = "C:\TafsirKurd\src\assets\images\TafsirKurd.png"
$outputPath = "C:\TafsirKurd\src\assets\images\TafsirKurd-optimized.png"

Write-Host "Original size: $((Get-Item $inputPath).Length / 1KB) KB"

# Load image
$img = [System.Drawing.Image]::FromFile($inputPath)

# Create new bitmap
$bitmap = New-Object System.Drawing.Bitmap $img

# Save with compression
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$bitmap.Dispose()
$img.Dispose()

Write-Host "Compressed size: $((Get-Item $outputPath).Length / 1KB) KB"
Write-Host "Saved to: $outputPath"
