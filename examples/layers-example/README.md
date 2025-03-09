# Povery Lambda Layers Example

This example demonstrates how to use Povery with AWS Lambda Layers for sharing code across multiple Lambda functions.

## Key Features

1. **Shared Code**: Models and services in a Lambda Layer
2. **Code Reuse**: Import shared code in multiple Lambda functions
3. **Reduced Bundle Size**: Keep Lambda functions lightweight
4. **Simplified Maintenance**: Update shared code in one place
5. **Database Integration**: PostgreSQL connection management in a shared layer
6. **Modern AWS SDK**: Uses AWS SDK v3 for modular and efficient AWS service access

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured
3. PostgreSQL database (optional, falls back to mock data)

## Project Structure

```
layers-example/
├── lambda/                  # Lambda functions
│   └── ProductAPI/          # Product API Lambda function
│       └── index.ts         # Lambda handler
├── layers/                  # Lambda Layers
│   └── common/              # Common layer
│       └── nodejs/          # Node.js runtime layer
│           ├── models/      # Shared models
│           ├── services/    # Shared services
│           │   ├── db-service.ts    # Database connection service
│           │   └── product-service.ts # Product business logic
│           └── index.ts     # Layer entry point
├── package.json             # Project dependencies
├── povery.json              # Povery configuration
└── tsconfig.json            # TypeScript configuration
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the common layer:
   ```bash
   npm run build:layers
   ```

3. (Optional) Set up database credentials:
   ```bash
   aws secretsmanager create-secret \
     --name YourSecretName \
     --secret-string '{"host":"your-db-host.amazonaws.com","user":"dbuser","password":"dbpassword","database":"dbname","port":5432,"ssl":true}'
   ```

4. (Optional) Set the environment variable for your secret:
   ```bash
   export DB_SECRET_ID=YourSecretName
   ```

5. Start the local development server:
   ```bash
   npm start
   ```

## Database Schema

If you're using a PostgreSQL database, you'll need this schema:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL
);
```

## How Lambda Layers Work

AWS Lambda Layers are a way to package and share code across multiple Lambda functions. When a Lambda function is invoked, the layers are extracted to the `/opt` directory in the Lambda execution environment.

In this example:
- The common layer is extracted to `/opt/nodejs/`
- Lambda functions import code from the layer using the path `/opt/nodejs/`

## Local Development

For local development, we've configured path mapping in `tsconfig.json` to simulate the Lambda Layer structure:

```json
{
  "compilerOptions": {
    "paths": {
      "/opt/nodejs/*": ["layers/common/nodejs/*"]
    }
  }
}
```

This allows you to import from `/opt/nodejs/` in your code, which will work both locally and in AWS Lambda.

## Deployment

When deploying to AWS, you need to:

1. Create a Lambda Layer from the common code
2. Attach the layer to your Lambda functions

Using AWS CDK or CloudFormation:

```typescript
// Create the layer
const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
  code: lambda.Code.fromAsset('layers/common'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
  description: 'Common code for Lambda functions',
});

// Attach the layer to a Lambda function
const productApiLambda = new lambda.Function(this, 'ProductAPI', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/ProductAPI'),
  layers: [commonLayer],
});
```

## Testing

```bash
# Get all products
curl http://localhost:3000/products

# Get a specific product
curl http://localhost:3000/products/123e4567-e89b-12d3-a456-426614174000
```

## Best Practices for Lambda Layers

1. **Keep layers focused**: Each layer should have a specific purpose
2. **Minimize layer size**: Include only necessary code and dependencies
3. **Version your layers**: Use semantic versioning for your layers
4. **Test layers thoroughly**: Ensure compatibility across all Lambda functions
5. **Document layer interfaces**: Clearly document the APIs exposed by your layers
6. **Handle fallbacks gracefully**: Provide fallback mechanisms when external services are unavailable 