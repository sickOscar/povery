
# Povery

#### Povery is a framework for building things on AWS Lambda with Typescript.

It's heavily opinionated.

Check out [povery-cli](https://github.com/sickOscar/povery-cli) for a way to organize 
your application written with AWS Lambda.

## Install

```bash
npm i povery
```

### Api Gateway 
This is an example `index.ts` to respond to an API Gateway request:
```typescript
// index.ts
import {povery, controller, api} from 'povery'

@controller
class Service {

    @api('GET', /hello')
    hello() {
        return 'hello world'
    }
}

exports.handler = povery.load(Service);
```
A lambda with this code can also be called in a RPC fashion

```typescript
// index.ts
const aws = require('aws-sdk');
const lambda = new aws.Lambda();

await lambda.invoke({
    FunctionName: 'my-service',
    Payload: JSON.stringify({
        action: 'hello',
        payload: {}
    })
}).promise();
```

### AWS Events
This is how to react to AWS events:
```typescript
// index.ts
import {povery, controller, api} from 'povery'
async function handler(event, context) {
    // DO SOMETHING
}

exports.handler = povery.forAwsEvent.load(handler);
```

### JWT Authorization

Povery supports JWT authorization. Authentication must be done on API Gateway.

Povery exposes a middleware named `Authorizer` that can be used to extract user information into request context and to apply ACL.


```typescript
// index.ts
import {povery, controller, api, Authorizer, acl} from 'povery';

@controller
class Controller {

    // only admin can access
    @api('GET', /hello')
    @acl(['ADMIN'])
    hello() {
        const user = Auth.getUser();
        const roles = Auth.getRoles();
        return 'hello world'
    }
}

exports.handler = povery.use(Authorizer(Controller)).load(Service);
```

By default, povery reads roles from Cognito Groups. If your user role is set on a user pool attribute, you can use the `Authorizer` middleware like this:

```typescript
exports.handler = povery.use(Authorizer(Controller, {
    roleClaim: "custom:role"
})).load(Service);
```

### Decorators
Many decorators are available to fill and validate DTOs and they can be applied to the parameters of the API method.
The validation logic is provided by `class-validator`. Available decorators are:
* `@body()` with the following options:
    ```typescript
    {
        transform?: (...args) => any, // the transform function used to transform the raw data to a DTO
        validate?: boolean // we can instruct Povery to perform a validation on the DTO based on its class-validator decorators
    }
    ```
* `@pathParam()` with the following options:
    ```typescript
    {
        name: string; // the name of the parameter
        transform?:  (...args) => any, // the transform function used to transform the raw value into an usable one
        validators?: PropertyDecorator[]; // the validators to be used
    }
    ```
* `@queryParam()` with the following options:
    ```typescript
    {
        name: string; // the name of the parameter
        transform?:  (...args) => any, // the transform function used to transform the raw value into an usable one
        validators?: PropertyDecorator[]; // the validators to be used
    }
    ```
* `@queryParams()` with the following options:
    ```typescript
    {
        transform?: (...args) => any, // the transform function used to transform the raw data to a DTO
        validate?: boolean // we can instruct Povery to perform a validation on the DTO based on its class-validator decorators
    }
    ```
* `@autowiredParam()` which can be used to create custom decorators. A function with the following signature must be provided:
    ```typescript
    (...args) => any
    ```
  where `...args` is the array of the API method parameters and the returned value will be the one to which the resulting parameter will be set to.

Here's an example:
```typescript
    @api('PATCH', '/user/:id')
    async updateUser(
        event: any,
        context: any,
        @pathParam({name: 'id', validators: [IsUUID('4')]}) id: string
        @body({transform: (event: any) => UserDto.fromObject(event), validate: true}) userDto: UserDto,
        @autowiredParam(() => 'Hi mom') customParameter: string,
    ): Promise<ResponseDto<DeviceDto[]>> {
        console.log(customParameter); // prints "Hi mom"
        ...
    }
    ```
