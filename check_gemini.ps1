$envPath = ".env.local"
if (Test-Path $envPath) {
    $content = Get-Content $envPath
    $apiKeyLine = $content | Select-String "GEMINI_API_KEY="
    if ($apiKeyLine) {
        $apiKey = $apiKeyLine.ToString().Split('=')[1].Trim()
        Write-Host "Found API Key: $apiKey"
        
        $url = "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey"
        try {
            $response = Invoke-RestMethod -Uri $url -Method Get
            $response | ConvertTo-Json -Depth 5 | Out-File "gemini_response.json" -Encoding utf8
            Write-Host "Full response saved to gemini_response.json"
        } catch {
            Write-Host "Error fetching models: $_"
            if ($_.Exception.Response) {
                Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
            }
        }
    } else {
        Write-Host "GEMINI_API_KEY not found in .env.local"
    }
} else {
    Write-Host ".env.local not found"
}
