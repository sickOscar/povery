# Povery Examples

This directory contains example projects demonstrating how to use Povery in different scenarios.

## Available Examples

### 1. First Setup

A basic example showing how to set up a simple API with Povery.

- Location: [first-setup](./first-setup)
- Features: Basic API endpoint

### 2. Authentication Example

Demonstrates how to implement authentication and authorization using AWS Cognito.

- Location: [auth-example](./auth-example)
- Features: 
  - AWS Cognito integration
  - Role-based access control
  - Protected endpoints

### 3. Database Example

Shows how to implement database connections following AWS Lambda best practices.

- Location: [database-example](./database-example)
- Features:
  - PostgreSQL connection pooling and reuse
  - Secure credential management with AWS Secrets Manager
  - Modern AWS SDK v3 implementation
  - Parameter validation
  - Error handling

### 4. Lambda Layers Example

Demonstrates how to use AWS Lambda Layers for sharing code across multiple functions.

- Location: [layers-example](./layers-example)
- Features:
  - Shared models and services
  - PostgreSQL database service in a shared layer
  - AWS SDK v3 for modular AWS service access
  - Code reuse across functions
  - Reduced bundle size
  - Simplified maintenance

## Running the Examples

Each example is a standalone project with its own README and instructions. To run an example:

1. Navigate to the example directory:
   ```bash
   cd examples/[example-name]
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Follow the specific instructions in the example's README.md file.

## Common Patterns

These examples demonstrate several common patterns for serverless applications:

1. **Stateless Design**: All examples follow a stateless design pattern suitable for serverless environments.

2. **Middleware Usage**: Examples show how to use Povery's middleware system for cross-cutting concerns.

3. **Parameter Validation**: Input validation using Povery's parameter decorators.

4. **Error Handling**: Proper error handling and response formatting.

5. **AWS Service Integration**: Integration with various AWS services like Cognito, Secrets Manager, and RDS PostgreSQL. 