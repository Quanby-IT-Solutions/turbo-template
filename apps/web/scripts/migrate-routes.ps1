# Script to batch migrate routes with import path updates
# This script updates import paths in route files and copies them to the target location

$sourceDir = "D:\PROJECTS\qhealth-web\qhealth-next\app\(private)"
$targetDir = "D:\PROJECTS\Qhealth\apps\web\app\(private)"

# Get all .tsx files recursively
$files = Get-ChildItem -Path $sourceDir -Recurse -Filter "*.tsx"

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($sourceDir.Length + 1)
    $targetPath = Join-Path $targetDir $relativePath
    $targetDirPath = Split-Path $targetPath -Parent
    
    # Create target directory if it doesn't exist
    if (-not (Test-Path $targetDirPath)) {
        New-Item -ItemType Directory -Path $targetDirPath -Force | Out-Null
    }
    
    # Read file content (compatible with older PowerShell)
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    # Update import paths
    $content = $content -replace '@/components/', '@/core/components/'
    $content = $content -replace '@/lib/api/auth', '@/features/auth/api/auth-api'
    $content = $content -replace '@/lib/api/patients', '@/features/patients/api/patients-api'
    $content = $content -replace '@/lib/api/doctors', '@/features/doctors/api/doctors-api'
    $content = $content -replace '@/lib/api/appointments', '@/features/appointments/api/appointments-api'
    $content = $content -replace '@/lib/api/types', '@/services/api/types'
    $content = $content -replace '@/lib/api', '@/services/api'
    
    # Write to target location (compatible with older PowerShell)
    [System.IO.File]::WriteAllText($targetPath, $content)
    
    Write-Host "Migrated: $relativePath"
}

Write-Host "`nMigration complete!"
