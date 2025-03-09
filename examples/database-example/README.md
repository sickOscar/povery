# Povery Database Example

This example demonstrates how to implement database connections in a Povery application following AWS Lambda best practices.

## Key Features

1. **Connection Pooling**: Reuse connections across Lambda invocations
2. **Connection Validation**: Validate connections before use
3. **Secure Credential Management**: Store database credentials in AWS Secrets Manager
4. **Parameter Validation**: Validate input parameters using DTOs
5. **Error Handling**: Proper error handling and reporting

## Prerequisites

1. AWS Account with appropriate permissions
2. PostgreSQL database (can be RDS or other)
3. AWS Secrets Manager secret containing database credentials

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your AWS credentials:
   ```bash
   aws configure
   ```

3. Create a secret in AWS Secrets Manager with your database credentials:
   ```bash
   aws secretsmanager create-secret \
     --name YourSecretName \
     --secret-string '{"host":"your-db-host.amazonaws.com","user":"dbuser","password":"dbpassword","database":"dbname","port":5432,"ssl":true}'
   ```

4. Set the environment variable for your secret:
   ```bash
   export DB_SECRET_ID=YourSecretName
   ```

5. Start the local development server:
   ```bash
   npm start
   ```

## Database Schema

This example uses a simple `users` table:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

## AWS Lambda Best Practices for Database Connections

This example implements several best practices for database connections in AWS Lambda:

### 1. Connection Reuse

The database connection pool is created outside the Lambda handler function, allowing it to be reused across invocations within the same container. This significantly reduces connection overhead.

```typescript
// Connection pool is defined outside the handler to be reused across invocations
let connectionPool: Pool | null = null;
```

### 2. Connection Validation

Before using a connection from the pool, we validate it to ensure it's still active. This prevents errors from stale connections.

```typescript
async function validateConnectionPool(pool: Pool): Promise<boolean> {
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('SELECT 1');
        return true;
    } catch (error) {
        console.error('Connection validation failed:', error);
        return false;
    } finally {
        if (client) {
            client.release();
        }
    }
}
```

### 3. Secure Credential Management

Database credentials are stored in AWS Secrets Manager, not hardcoded or in environment variables.

```typescript
async function getDbCredentials(): Promise<DbCredentials> {
    const secretId = process.env.DB_SECRET_ID;
    
    if (!secretId) {
        throw new Error('DB_SECRET_ID environment variable is not set');
    }
    
    try {
        const command = new GetSecretValueCommand({ SecretId: secretId });
        const response = await secretsManager.send(command);
        
        if (!response.SecretString) {
            throw new Error('Secret string is empty');
        }
        
        return JSON.parse(response.SecretString) as DbCredentials;
    } catch (error) {
        console.error('Error retrieving database credentials:', error);
        throw error;
    }
}
```

### 4. Connection Pooling

Using a connection pool instead of individual connections improves performance and reliability.

```typescript
return new Pool({
    host: credentials.host,
    user: credentials.user,
    password: credentials.password,
    database: credentials.database,
    port: credentials.port || 5432,
    ssl: credentials.ssl ? { rejectUnauthorized: false } : undefined,
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000 // How long to wait for a connection to become available
});
```

### 5. Error Handling

Proper error handling ensures that database errors don't crash the Lambda function.

```typescript
try {
    const users = await executeQuery<User>('SELECT * FROM users LIMIT 100');
    return { users };
} catch (error) {
    console.error('Error fetching users:', error);
    throw new PoveryError('Failed to fetch users', 500);
}
```

## Testing

```bash
# Get all users
curl http://localhost:3000/users

# Get a specific user
curl http://localhost:3000/users/123e4567-e89b-12d3-a456-426614174000

# Create a new user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'
``` 