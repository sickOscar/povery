# Povery

## A TypeScript Framework for AWS Lambda

![workflow](https://github.com/sickOscar/povery/actions/workflows/main.yml/badge.svg)

Povery is a lightweight, decorator-based framework designed specifically for building serverless applications on AWS Lambda with TypeScript. It provides a structured approach to handling API Gateway requests, AWS events, and authentication/authorization flows.

Check out [povery-cli](https://github.com/sickOscar/povery-cli) for organizing applications built with Povery.

## Table of Contents

- [Why Povery?](#why-povery)
- [Installation](#installation)
- [Usage](#usage)
  - [API Gateway Integration](#api-gateway-integration)
  - [AWS Event Handling](#aws-event-handling)
  - [RPC Functionality](#rpc-functionality)
- [Middleware System](#middleware-system)
- [Authentication & Authorization](#authentication--authorization)
- [API Stage Handling](#api-stage-handling)
- [Request Parameters](#request-parameters)
  - [Path Parameters](#path-parameters)
  - [Request Body](#request-body)
  - [Query Parameters](#query-parameters)
  - [Custom Parameters](#custom-parameters)
- [Validation](#validation)
  - [Validation with Parameter Decorators](#validation-with-parameter-decorators)
  - [DTO Validation](#dto-validation)
  - [Validation Error Handling](#validation-error-handling)
  - [Custom Validation](#custom-validation)
  - [Validation Best Practices](#validation-best-practices)
- [Examples](#examples)
  - [Basic Setup](#basic-setup)
  - [Authentication with Cognito](#authentication-with-cognito)
  - [Database Integration](#database-integration)
  - [Lambda Layers](#lambda-layers)
- [Logging](#logging)
- [TypeScript Configuration](#typescript-configuration)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Why Povery?

AWS Lambda operates fundamentally differently from traditional web servers. While many developers attempt to use Express.js with Lambda, this approach introduces [several](https://www.quora.com/Should-you-use-Express-js-with-AWS-Lambda) [significant](https://stackoverflow.com/questions/64457577/should-i-be-using-express-js-in-a-serverless-app) [issues](https://medium.com/dailyjs/six-reasons-why-you-shouldnt-run-express-js-inside-aws-lambda-102e3a50f355).

Povery addresses these challenges by:
- Providing a Lambda-native approach to handling HTTP requests
- Introducing familiar concepts like controllers, decorators, and middleware
- Offering built-in support for parameter validation and type safety
- Integrating seamlessly with AWS services like API Gateway and Cognito

## Installation

```bash
npm i povery
```

## Usage

### API Gateway Integration

Handle API Gateway proxy requests with clean, decorator-based controllers:

```typescript
import { povery, controller, api } from 'povery'

@controller
class Controller {
    @api('GET', '/hello')
    sayHello() {
        return "We're povery!"
    }
}

exports.handler = povery.load(Controller);
```

This code responds to GET requests on the `/hello` route and automatically formats the response for API Gateway:

```json
{
    "headers": {},
    "isBase64Encoded": false,
    "statusCode": 200,
    "body": "We're povery!" 
}
```

### AWS Event Handling

Process non-HTTP AWS events with the `forAwsEvent` middleware:

```typescript
import { povery, forAwsEvent } from "povery";

async function handler(event, context) {
  // Process the AWS event
}

exports.handler = povery
    .use(forAwsEvent())
    .load(handler);
```

The `forAwsEvent` middleware marks the context as an AWS event, which changes how Povery processes the request. Instead of trying to match HTTP routes, it directly passes the event to your handler function. This is useful for handling AWS events like:

- S3 bucket events
- DynamoDB stream events
- CloudWatch scheduled events
- SNS notifications
- SQS message processing
- Custom events from other Lambda functions

### RPC Functionality

In addition to HTTP routing, Povery supports RPC-style (Remote Procedure Call) invocations of controller methods:

```typescript
import { povery } from "povery";

@controller
class RPCController {
    calculateSum(payload) {
        const { a, b } = payload;
        return { result: a + b };
    }
    
    getUserData(payload) {
        const { userId } = payload;
        // Fetch and return user data
        return { user: { id: userId, name: "Example    User" } };
    }
}

exports.handler = povery.load(RPCController);
```

To invoke these methods, send a request with `action` and `payload` properties:

```json
{
    "action": "calculateSum",
    "payload": {
        "a": 5,
        "b": 3
    }
}
```

The response will be the direct return value from the method:

```json
{
    "result": 8
}
```

RPC calls are useful when:
- You need direct method invocation without HTTP routing overhead
- You're building internal services that communicate between Lambda functions
- You want a simpler interface for function-to-function communication

## Middleware System

Povery uses a middleware system to intercept and process events before and after they reach your handler functions. Middlewares are stateless, aligning with Lambda's execution model:

```typescript
const exampleMiddleware = {
    setup: (event, context) => {
        // Executed BEFORE the handler method
        // event and context are passed by reference and can be modified
    }, 
    teardown: (event, context, executionResult, error) => {
        // Executed AFTER the handler method
        // Can modify the final response
    }
}

exports.handler = povery
    .use(exampleMiddleware)
    .load(Controller);
```

Middlewares can be async and are executed in the order they're added.

## Authentication & Authorization

Povery doesn't handle authentication directly, as this is best delegated to API Gateway and AWS Cognito. However, it provides tools for authorization:

```typescript
import { povery, controller, api, Authorizer, acl } from 'povery';

@controller
class Controller {
    // Only users with ADMIN role can access
    @api('GET', '/admin-only')
    @acl(['ADMIN'])
    adminOnlyEndpoint() {
        const user = Auth.getUser();
        const roles = Auth.getRoles();
        return 'Admin access granted';
    }
}

exports.handler = povery
    .use(Authorizer(Controller))
    .load(Controller);
```

By default, povery reads roles from Cognito Groups. If your user role is set on a user pool attribute, you can use the `Authorizer` middleware like this:

```typescript
exports.handler = povery
  .use(
    Authorizer(Controller, {
      roleClaim: "custom:role"
    })
  )
  .load(Controller);
```

## API Stage Handling

When using AWS HTTP APIs, the stage name is included in the path. Povery automatically handles this by removing the stage prefix from the path before matching routes:

```
// Example:
// API Stage: dev
// Original path: /dev/users
// Path used for route matching: /users
```

This ensures that your route definitions don't need to include the stage name. The stage removal is only applied when:
1. The request includes a stage name in the `requestContext.stage` property
2. The path starts with the stage name followed by a slash (`/{stage}/...`)

This prevents issues with paths that might contain the stage name as part of a resource path (e.g., `/dev/devices` when the stage is `dev`).

## Request Parameters

Povery provides several decorators to handle and validate request parameters:

### Path Parameters

Path parameters are automatically validated and transformed:

```typescript
@api('GET', '/user/:id')
async getUserById(
    event: any,
    context: any,
    @pathParam({name: 'id', validators: [IsUUID('4')]}) id: string
) {
    // id contains the validated UUID from the path
    return getUserService.findById(id);
}
```

You can also transform path parameters to different types using the `transform` option:

```typescript
@api('GET', '/products/:id')
async getProduct(
    event: any,
    context: any,
    @pathParam({
        name: 'id',
        transform: (val) => parseInt(val, 10)
    }) id: number
) {
    // id is now a number, not a string
    return productService.findById(id);
}
```

The transform function is applied to the specific parameter value, allowing you to convert strings from the URL path to appropriate types like numbers, booleans, or custom objects.

### Request Body

The `@body` decorator is used to validate and transform the request body. It supports automatic type conversion and validation:
```typescript
@api('PATCH', '/user/:id')
async updateUser(
    event: any,
    context: any,
    @body({
        transform: (event: any) => UserDto.fromObject(event), 
        validate: true
    }) userDto: UserDto
) {
    // userDto contains the validated request body
    return userService.update(userDto);
}
```

### Query Parameters

Individual query parameters:

```typescript
@api('GET', '/users')
async getUsers(
    event: any,
    context: any,
    @queryParam({name: 'status', validators: [IsString()]}) status: string
) {
    // EXAMPLE CODE, status contains the validated query parameter
    return userService.findByStatus(status);
}
```

Multiple query parameters:

```typescript
@api('GET', '/users')
async getUsers(
    event: any,
    context: any,
    @queryParams({
        transform: (params) => new UserFilterDto(params),
        validate: true
    }) filters: UserFilterDto
) {
    // filters contains all validated query parameters
    return userService.findWithFilters(filters);
}
```

### Custom Parameters

Create custom parameter decorators:

```typescript
@api('GET', '/timestamp')
async getWithTimestamp(
    event: any,
    context: any,
    @autowiredParam(() => new Date().toISOString()) timestamp: string
) {
    console.log(timestamp); // Current ISO timestamp
    return { timestamp };
}
```

## Validation

Povery uses [class-validator](https://www.npmjs.com/package/class-validator) for parameter validation, providing type safety and runtime validation.

### Validation with Parameter Decorators

Each parameter decorator (`@body`, `@pathParam`, `@queryParam`, etc.) supports validation through the `validators` option:

```typescript
import { IsUUID, IsString, IsInt, Min, Max } from 'class-validator';

@api('GET', '/products/:id')
async getProduct(
    event: any,
    context: any,
    @pathParam({name: 'id', validators: [IsUUID('4')]}) id: string,
    @queryParam({name: 'fields', validators: [IsString()]}) fields: string,
    @queryParam({name: 'limit', validators: [IsInt(), Min(1), Max(100)]}) limit: number
) {
    // All parameters are validated before this code runs
    return productService.findById(id, fields, limit);
}
```

### DTO Validation

For complex objects like request bodies, create Data Transfer Objects (DTOs) with validation rules:

```typescript
import { IsEmail, IsString, Length, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @Length(2, 50)
    name: string;
    
    @IsEmail()
    email: string;
    
    @IsString()
    @Length(8, 100)
    password: string;
    
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
    
    static fromObject(obj: any): CreateUserDto {
        const dto = new CreateUserDto();
        Object.assign(dto, obj);
        return dto;
    }
}
```

Then use it with the `@body` decorator:

```typescript
@api('POST', '/users')
async createUser(
    event: any,
    context: any,
    @body({
        transform: (event: any) => CreateUserDto.fromObject(JSON.parse(event.body)), 
        validate: true
    }) userDto: CreateUserDto
) {
    // userDto is fully validated and typed
    return userService.create(userDto);
}
```

### Validation Error Handling

When validation fails, Povery automatically returns an error response with status code 400 and details about the validation errors:

```json
{
    "statusCode": 400,
    "body": {
        "errorMessage": "Validation failed",
        "errorData": [
            {
                "property": "email",
                "constraints": {
                    "isEmail": "email must be a valid email address"
                }
            },
            {
                "property": "password",
                "constraints": {
                    "length": "password must be longer than or equal to 8 characters"
                }
            }
        ]
    }
}
```

### Custom Validation

You can create custom validators by implementing the `ValidatorConstraintInterface`:

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
    validate(password: string, args: ValidationArguments) {
        // Password must contain at least one uppercase letter, one lowercase letter,
        // one number, and one special character
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    }
    
    defaultMessage(args: ValidationArguments) {
        return 'Password is not strong enough';
    }
}
```

Then use it in your DTOs:

```typescript
import { Validate } from 'class-validator';

export class UserDto {
    // Other properties...
    
    @Validate(IsStrongPasswordConstraint)
    password: string;
}
```

### Validation Best Practices

1. **Always validate user input**: Never trust client-side data
2. **Use specific validators**: Choose the most specific validator for each field
3. **Provide meaningful error messages**: Customize error messages to help users fix issues
4. **Combine validators**: Use multiple validators to enforce complex rules
5. **Create reusable DTOs**: Define DTOs that can be reused across endpoints
6. **Separate validation from business logic**: Keep validation in DTOs and decorators

By leveraging Povery's validation system, you can ensure that your Lambda functions only process valid data, reducing bugs and improving security.

## Examples

The `examples` directory contains several sample projects demonstrating how to use Povery in different scenarios:

### Basic Setup

A simple example showing how to set up a basic API with Povery.

```typescript
import { povery, controller, api } from 'povery'

@controller
class Controller {
    @api('GET', '/test')
    sayHello() {
        return `We're povery!`
    }
}

exports.handler = povery.load(Controller);
```

This example demonstrates:
- Basic controller setup
- API endpoint definition
- Lambda handler export

### Authentication with Cognito

Demonstrates how to implement authentication and authorization using AWS Cognito.

```typescript
import { povery, controller, api, acl, Authorizer, Auth } from 'povery';

@controller
class AuthController {
    @api('GET', '/profile')
    @acl(['USER', 'ADMIN'])
    getUserProfile() {
        const user = Auth.getUser();
        const roles = Auth.getRoles();
        
        return {
            message: 'You are authenticated!',
            user: {
                username: user.username,
                email: user.email
            },
            roles: roles
        };
    }
    
    @api('GET', '/admin')
    @acl(['ADMIN'])
    getAdminDashboard() {
        return {
            message: 'Welcome to the admin dashboard!',
            secretData: 'This is only visible to admins'
        };
    }
}

exports.handler = povery
    .use(Authorizer(AuthController))
    .load(AuthController);
```

This example demonstrates:
- AWS Cognito integration
- Role-based access control
- Protected endpoints

### Database Integration

Shows how to implement database connections following AWS Lambda best practices.

```typescript
import { povery, controller, api, body, pathParam } from 'povery';
import { executeQuery } from './db';
import { User, CreateUserDto } from './models';

@controller
class UserController {
    @api('GET', '/users')
    async getUsers() {
        try {
            const users = await executeQuery<User>('SELECT * FROM users LIMIT 100');
            return { users };
        } catch (error) {
            console.error('Error fetching users:', error);
            throw new PoveryError('Failed to fetch users', 500);
        }
    }
    
    @api('POST', '/users')
    async createUser(
        event: any,
        context: any,
        @body({
            transform: (event: any) => CreateUserDto.fromObject(JSON.parse(event.body)),
            validate: true
        }) userDto: CreateUserDto
    ) {
        // Implementation...
    }
}

exports.handler = povery.load(UserController);
```

This example demonstrates:
- PostgreSQL connection pooling and reuse
- Secure credential management with AWS Secrets Manager
- Parameter validation with DTOs
- Error handling

### Lambda Layers

Demonstrates how to use AWS Lambda Layers for sharing code across multiple functions.

```typescript
// In Lambda function:
import { povery, controller, api, pathParam } from 'povery';
import { productService, GetProductDto } from '/opt/nodejs';

@controller
class ProductController {
    @api('GET', '/products')
    async getProducts() {
        const products = await productService.getAllProducts();
        return { products };
    }
    
    @api('GET', '/products/:id')
    async getProductById(
        event: any,
        context: any,
        @pathParam({ name: 'id', validators: [] }) id: string
    ) {
        // Implementation...
    }
}

exports.handler = povery.load(ProductController);
```

This example demonstrates:
- Shared models and services in a Lambda Layer
- PostgreSQL database service in a shared layer
- Code reuse across functions
- Reduced bundle size

For more detailed examples, check out the [examples directory](https://github.com/sickOscar/povery/tree/master/examples) in the repository.

## Logging

Set the environment variable `LOG_LEVEL` to `DEBUG` for detailed execution information. Be cautious with sensitive data and CloudWatch costs.

## TypeScript Configuration

Enable decorator support in your `tsconfig.json`:

```json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}
```

## Testing

Povery provides a `withContext` helper for testing:

```typescript
import { withContext } from 'povery';

describe('User Controller', () => {
    it('should get user by ID', withContext(
        {
            user: {
                "email": "test@example.com"
            }
        },
        async () => {
            // Test code here
            const result = await userController.getUserById('123');
            expect(result).toBeDefined();
        }
    ));
});
```

## Contributing

Feel free to open issues and pull requests.

## License

MIT