# This script sends a test request to the /identify endpoint
# and displays the current rate limit status.

# --- You can change these values for testing ---
$testEmail = "user@example.com"
$testPhoneNumber = "1122334455"
# ---------------------------------------------

# Prepare the request body as a JSON string
$body = @{
    email = $testEmail
    phoneNumber = $testPhoneNumber
} | ConvertTo-Json

Write-Host "Sending request with Email: $testEmail, Phone: $testPhoneNumber" -ForegroundColor Yellow

# Send the POST request to the API
try {
    # The -UseBasicParsing flag can prevent issues in some PowerShell environments.
    $response = Invoke-WebRequest -Uri http://localhost:3000/identify -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
    
    # Extract headers
    $limit = $response.Headers["RateLimit-Limit"]
    $remaining = $response.Headers["RateLimit-Remaining"]
    $resetInSeconds = $response.Headers["RateLimit-Reset"]

    # Display the results in a user-friendly format
    Write-Host "`n✅ Success!" -ForegroundColor Green
    Write-Host "`n--- Rate Limit Status ---"
    Write-Host "  - Total Requests Allowed: $limit"
    Write-Host "  - Requests Remaining:     $remaining"
    Write-Host "  - Resets in:              $resetInSeconds seconds"
    Write-Host "-------------------------"
    
    Write-Host "`n--- Server Response ---"
    # The response content is also JSON, so we can format it nicely.
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
    Write-Host "-----------------------"

} catch {
    Write-Host "`n❌ An error occurred while sending the request." -ForegroundColor Red
    # Print the full error details
    Write-Host $_
} 