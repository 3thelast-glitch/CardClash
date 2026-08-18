$files = @(
  "lib\game\cards-batch-1-fixed.ts",
  "lib\game\cards-batch-2-fixed.ts",
  "lib\game\cards-batch-3-fixed.ts",
  "lib\game\cards-batch-4-fixed.ts",
  "lib\game\cards-batch-5-fixed.ts",
  "lib\game\cards-batch-6-fixed.ts",
  "lib\game\cards-batch-2-anime.ts",
  "lib\game\cards-batch-3-anime.ts",
  "lib\game\cards-batch-4-anime.ts",
  "data\cards-batch-1-fixed.ts",
  "data\cards-batch-2-fixed.ts",
  "data\cards-batch-3-fixed.ts",
  "data\cards-batch-4-fixed.ts",
  "data\cards-batch-5-fixed.ts",
  "data\cards-batch-6-fixed.ts"
)

$allIds = @{}
foreach($f in $files) {
  if (Test-Path $f) {
    $content = Get-Content $f
    $matches = $content | Select-String -Pattern "\s+id:\s+'([^']+)'"
    $ids = @()
    foreach($m in $matches) { $ids += $m.Matches.Groups[1].Value }
    Write-Host "$f : $($ids.Count) cards"
    foreach($id in $ids) {
      if ($allIds.ContainsKey($id)) {
        $allIds[$id] += ", $f"
      } else {
        $allIds[$id] = $f
      }
    }
  } else {
    Write-Host "$f : NOT FOUND"
  }
}

Write-Host "`n=== TOTAL UNIQUE CARDS: $($allIds.Count) ==="

# Find IDs that appear in multiple files
$dupes = $allIds.GetEnumerator() | Where-Object { $_.Value -match "," }
if ($dupes) {
  Write-Host "`n=== DUPLICATE IDs (same id in multiple files) ==="
  $dupes | Sort-Object Name | ForEach-Object { Write-Host "  $($_.Name) -> $($_.Value)" }
  Write-Host "`nTotal duplicated IDs: $($dupes.Count)"
} else {
  Write-Host "`nNo duplicates found"
}
