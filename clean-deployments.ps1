# 清理 GitHub Pages 旧 deployments（保留最近 2 条，使用 gh CLI）
$owner = "Chaniug"
$repo = "Chaniug"
$keep = 2  # 保留最新几条

Write-Host "正在获取 deployments..." -ForegroundColor Cyan
$ids = gh api "repos/$owner/$repo/deployments?per_page=100" --paginate --jq 'sort_by(.created_at) | reverse | .[' + $keep + ':] | .[].id'
if (-not $ids -or $ids.Count -eq 0) {
    Write-Host "无需要清理的旧 deployments。" -ForegroundColor Green
    exit 0
}

Write-Host "将删除 $($ids.Count) 条旧 deployments，保留最新 $keep 条" -ForegroundColor Yellow

foreach ($id in $ids) {
    Write-Host "删除 deployment $id..." -ForegroundColor Gray
    gh api "repos/$owner/$repo/deployments/$id" -X DELETE --silent
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  已删除" -ForegroundColor Green
    } else {
        Write-Host "  删除失败" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "清理完成！剩余 $keep 条 deployments。" -ForegroundColor Green
