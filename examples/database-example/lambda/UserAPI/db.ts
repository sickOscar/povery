import { Pool, PoolClient } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Database connection manager for AWS Lambda
 * 
 * This module follows AWS Lambda best practices for database connections:
 * 1. Connection reuse across invocations (outside the handler)
 * 2. Connection validation before use
 * 3. Proper error handling and reconnection logic
 * 4. Secure credential management using AWS Secrets Manager
 */

// Connection pool is defined outside the handler to be reused across invocations
let connectionPool: Pool | null = null;

// Secrets Manager client
const secretsManager = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'us-east-1'
});

// Interface for database credentials
interface DbCredentials {
    host: string;
    user: string;
    password: string;
    database: string;
    port?: number;
    ssl?: boolean;
}

/**
 * Retrieves database credentials from AWS Secrets Manager
 */
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

/**
 * Creates a new database connection pool
 */
async function createConnectionPool(): Promise<Pool> {
    try {
        // Get credentials from Secrets Manager
        const credentials = await getDbCredentials();
        
        // Create connection pool
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
    } catch (error) {
        console.error('Error creating connection pool:', error);
        throw error;
    }
}

/**
 * Validates the connection pool by executing a simple query
 */
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

/**
 * Gets a connection pool, creating it if necessary or if validation fails
 */
export async function getConnectionPool(): Promise<Pool> {
    // If pool doesn't exist, create it
    if (!connectionPool) {
        console.log('Creating new connection pool');
        connectionPool = await createConnectionPool();
        return connectionPool;
    }
    
    // Validate existing pool
    const isValid = await validateConnectionPool(connectionPool);
    
    // If validation fails, create a new pool
    if (!isValid) {
        console.log('Connection pool validation failed, creating new pool');
        connectionPool = await createConnectionPool();
    }
    
    return connectionPool;
}

/**
 * Executes a query using the connection pool
 */
export async function executeQuery<T>(
    sql: string, 
    params: any[] = []
): Promise<T[]> {
    const pool = await getConnectionPool();
    
    try {
        const result = await pool.query(sql, params);
        return result.rows as T[];
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
} 