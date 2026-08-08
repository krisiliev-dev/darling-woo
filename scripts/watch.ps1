$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\lora_\darling\darling-woo'
"--- watcher started {0:yyyy-MM-dd HH:mm:ss} ---" -f (Get-Date) | Out-File -FilePath 'C:\Users\lora_\darling\darling-woo\scripts\.watch.log' -Append -Encoding utf8
& 'C:\Users\lora_\AppData\Local\hermes\node\node.exe' 'scripts\build.js' '--watch' *>&1 | Out-File -FilePath 'C:\Users\lora_\darling\darling-woo\scripts\.watch.log' -Append -Encoding utf8