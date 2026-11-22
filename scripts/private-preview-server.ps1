# Xiang's Blog: private local preview, Windows PowerShell 5+.
# Binds ONLY to 127.0.0.1. No Python/Node.js/admin privileges needed.
$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$separator = [System.IO.Path]::DirectorySeparatorChar
$rootPrefix = $root.TrimEnd($separator) + $separator
$crlf = [string][char]13 + [char]10
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".mjs"  = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".xml"  = "application/xml; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".gif"  = "image/gif"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".otf"  = "font/otf"
    ".wasm" = "application/wasm"
    ".txt"  = "text/plain; charset=utf-8"
    ".map"  = "application/json; charset=utf-8"
}

function Send-Response {
    param(
        [System.IO.Stream] $Stream,
        [int] $Status,
        [byte[]] $Body,
        [string] $ContentType,
        [bool] $HeadOnly = $false
    )
    $reason = switch ($Status) {
        200 { "OK" }
        400 { "Bad Request" }
        403 { "Forbidden" }
        404 { "Not Found" }
        405 { "Method Not Allowed" }
        default { "Internal Server Error" }
    }
    $headers = "HTTP/1.1 $Status $reason" + $crlf +
        "Content-Type: $ContentType" + $crlf +
        "Content-Length: $($Body.Length)" + $crlf +
        "Cache-Control: no-store" + $crlf +
        "X-Content-Type-Options: nosniff" + $crlf +
        "Connection: close" + $crlf + $crlf
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    if (-not $HeadOnly -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$url = "http://127.0.0.1:$port/individual-blog/zh/"

Write-Host ""
Write-Host "Xiang's Blog - PRIVATE local preview"
Write-Host "Open: $url"
Write-Host "Only this computer can connect. Press Ctrl+C to stop."
Write-Host ""
Start-Process $url

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 5000
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new(
                $stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

            while ($true) {
                $line = $reader.ReadLine()
                if ($null -eq $line -or $line.Length -eq 0) { break }
            }

            $pieces = $requestLine.Split(' ')
            if ($pieces.Length -lt 2) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Bad Request")
                Send-Response $stream 400 $body "text/plain; charset=utf-8"
                continue
            }

            $method = $pieces[0]
            $headOnly = $method -eq "HEAD"
            if ($method -ne "GET" -and -not $headOnly) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Method Not Allowed")
                Send-Response $stream 405 $body "text/plain; charset=utf-8"
                continue
            }

            $urlPath = $pieces[1].Split('?')[0]
            $decoded = [System.Uri]::UnescapeDataString($urlPath)
            $relative = $decoded.TrimStart('/').Replace('/', $separator)
            $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relative))

            if (-not ($full.Equals($root, [System.StringComparison]::OrdinalIgnoreCase) -or
                      $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase))) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
                Send-Response $stream 403 $body "text/plain; charset=utf-8" $headOnly
                continue
            }

            if ([System.IO.Directory]::Exists($full)) {
                $full = [System.IO.Path]::Combine($full, "index.html")
            }
            if (-not [System.IO.File]::Exists($full)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
                Send-Response $stream 404 $body "text/plain; charset=utf-8" $headOnly
                continue
            }

            $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
            $type = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) { $type = $mimeTypes[$ext] }
            $body = [System.IO.File]::ReadAllBytes($full)
            Send-Response $stream 200 $body $type $headOnly
        }
        catch {
            Write-Warning "Request error: $($_.Exception.Message)"
        }
        finally {
            $client.Close()
        }
    }
}
finally {
    $listener.Stop()
}
