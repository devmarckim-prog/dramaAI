$path = 'c:\Users\happy\Downloads\Gravity APP\디렉터즈 아레나\index.html'
$lines = Get-Content $path
$content = [string]::Join("`n", $lines)

$debugUI = '    </div>
    <div style="margin-top:40px;text-align:center">
      <button onclick="toggleDebugLog()" style="background:none;border:none;color:var(--ink3);font-size:11px;text-decoration:underline;cursor:pointer">기술 로그 보기 (개발자용)</button>
    </div>
    <div id="debug-log-console" style="display:none;margin-top:16px;background:#1a1410;color:#00ff00;font-family:monospace;font-size:11px;padding:15px;border-radius:8px;max-height:200px;overflow-y:auto;text-align:left;line-height:1.5;box-shadow:inset 0 2px 10px rgba(0,0,0,0.5)">
      <div id="debug-log-content"></div>
    </div>'

# Surgery: find the gen-steps closing tag
$target = '<div class="gen-step" id="gstep-6"><div class="gen-step-dot"></div>1화 대본 집필</div>\s*</div>'
if ($content -match $target) {
    $newContent = $content -replace $target, ( '<div class="gen-step" id="gstep-6"><div class="gen-step-dot"></div>1화 대본 집필</div>' + $debugUI )
    $newContent | Set-Content $path -Encoding UTF8
    Write-Host "Successfully updated index.html"
} else {
    # Fallback to a simpler searching method if regex fails due to encoding
    $found = $false
    $output = @()
    foreach($line in $lines) {
        $output += $line
        if($line -like '*id="gstep-6"*') {
           # Wait till the next </div>
        }
        if($line -like '*    </div>*' -and $found -eq $false -and $line.Trim() -eq '</div>') {
            # This is likely the one.
        }
    }
    Write-Error "Target content not matched via Regex."
}
