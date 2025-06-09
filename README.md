# Identity Reconciliation Service

This service provides identity reconciliation functionality by tracking and linking user identities based on their email addresses and phone numbers.


1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables by copying the example file:
```bash
cp .env.example .env
```
Then edit the `.env` file with your database credentials.

3. Initialize the database:
```bash
npx prisma db push
```

4. Start the development server:
```bash
npm run dev
```

## API Usage

### POST /identify

Endpoint to identify and reconcile user identities.

**Request Body:**
```json
{
  "email": "string | null",
  "phoneNumber": "string | null"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}
```


## Additional Features

### GET /stats

Provides basic analytics about the contacts in the system. This endpoint was added as an extra feature and was not part of the original BiteSpeed requirements.

**Request Body:** None

**Response:**
```json
{
  "totalPrimaryContacts": number,
  "totalSecondaryContacts": number,
  "totalContacts": number,
  "newContactsLast24Hours": number
}
```

### Rate Limiting

To protect the service from abuse and ensure fair usage, the API implements rate limiting. By default, each IP address is limited to **100 requests per 15 minutes**.

If this limit is exceeded, the API will respond with a `429:Too Many Requests` status code. The following headers are included in every response to help you track your usage:
- `RateLimit-Limit`: The total number of requests allowed in the current window.
- `RateLimit-Remaining`: The number of requests remaining in the current window.
- `RateLimit-Reset`: The number of seconds remaining until the rate limit window resets.

## Examples

1. Creating a new contact:
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "phoneNumber": "1234567890"}'
```

2. Identifying an existing contact:
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'
```

### Testing the Rate Limiter (PowerShell)

To easily check the rate limit status, a PowerShell script is included in the project.

1.  **Start your server** in one terminal:
    ```bash
    npm run dev
    ```

2.  **In a new PowerShell terminal**, run the script:
    ```powershell
    .\\check-rate-limit.ps1
    ```

This will send a test request and display the current rate limit values (`Limit`, `Remaining`, and `Reset` in seconds) along with the server's JSON response.

**Note:** If you encounter an error about script execution being disabled, run the following command in PowerShell to allow scripts for your current session, then try again:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Error Handling

- 400 Bad Request: When neither email nor phoneNumber is provided
- 500 Internal Server Error: For server-side errors 

## Database Management

### Resetting the Database

If you need to completely clear all data from your database and start fresh (e.g., for testing a new sequence of operations or clearing out old test data), you can use the following command:

```bash
npx prisma migrate reset
```

**What it does:**
- **Drops the database:** Deletes all tables and data.
- **Re-applies migrations:** Recreates the database schema based on your Prisma migration files. If you don't have migrations, it might prompt you to create an initial one.
- **Prompts for confirmation:** Prisma CLI will ask for confirmation before deleting any data, as this operation is destructive.

**When to use:**
- Before starting a new, clean testing session.
- To clear out all existing records and reset the database to its initial schema state.
- If your database gets into an inconsistent state during development and you want to start over.

**Caution:** This command will permanently delete all data in your development database.

### Viewing and Managing Data

To visually inspect, query, and manage the data in your database during development, you can use Prisma Studio:

```bash
npx prisma studio
```

**What it does:**
- Starts a local web server and opens Prisma Studio in your default browser.
- Provides a graphical user interface to view your models (tables) and their data.
- Allows you to create, read, update, and delete records directly.

**When to use:**
- To quickly check the current state of your data.
- To manually insert or modify records for testing purposes.
- To debug issues by examining the data related to specific operations.
- When you prefer a visual tool over writing SQL queries for simple data inspection. 