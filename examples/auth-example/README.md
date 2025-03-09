# Povery Authentication Example

This example demonstrates how to implement authentication and authorization in a Povery application using AWS Cognito, and how to augment the user with additional data from a database.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS Cognito User Pool set up with:
   - App client configured
   - User groups created (e.g., 'USER', 'ADMIN')
3. API Gateway configured with Cognito Authorizer
4. Optional: A database for storing additional user data

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your AWS credentials:
   ```bash
   aws configure
   ```

3. Start the local development server:
   ```bash
   npm start
   ```

## Testing

### Local Testing

When testing locally, you'll need to include a valid JWT token in your requests:

```bash
# Get a token (replace with your actual Cognito details)
TOKEN=$(aws cognito-idp initiate-auth \
  --client-id YOUR_CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=your_username,PASSWORD=your_password \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Test the profile endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/profile

# Test the admin endpoint (requires ADMIN role)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/admin

# Update preferences
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preferences":{"theme":"dark","notifications":true}}' \
  http://localhost:3000/preferences
```

## How It Works

1. **Authentication**: AWS Cognito handles the authentication process and provides a JWT token.
2. **Authorization**: Povery's `Authorizer` middleware extracts user information and roles from the JWT token.
3. **User Data Augmentation**: The `userDataMiddleware` fetches additional user data from a database and adds it to the user object.
4. **Access Control**: The `@acl` decorator restricts access to endpoints based on user roles.

## Key Components

- **Authorizer Middleware**: Extracts user information from the Cognito authorizer
- **User Data Middleware**: Augments the user with additional data from a database
- **@acl Decorator**: Restricts access to endpoints based on user roles
- **Auth Utility**: Provides access to the authenticated user, roles, and additional attributes

### Auth Utility Methods

- `Auth.getUser()`: Get the complete user object
- `Auth.getRoles()`: Get the user's roles
- `Auth.getAttribute(attributeName)`: Get a specific attribute from the user
- `Auth.setAttribute(attributeName, value)`: Set a specific attribute on the user

## Best Practices

1. Always use HTTPS in production
2. Set appropriate token expiration times
3. Use the principle of least privilege when assigning roles
4. Validate and sanitize all user inputs
5. Use environment variables for sensitive configuration
6. Cache database queries for user data when appropriate
7. Consider implementing a refresh mechanism for user data that may change during a session 