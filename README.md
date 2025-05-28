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