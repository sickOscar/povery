# Povery

#### Povery is a framework for building things on AWS Lambda with Typescript.

![workflow](https://github.com/sickOscar/povery/actions/workflows/main.yml/badge.svg)

Check out [povery-cli](https://github.com/sickOscar/povery-cli) for a way to organize
your application written with AWS Lambda.

### Why Povery? 

AWS Lambda operates in a very different way from a normal web server, so it is very important 
for you to know the model of AWS serverless computing before jumping into it. Many people online 
suggest to use express to create your web application on Lambda but we find it a quirky approach 
for [many](https://www.quora.com/Should-you-use-Express-js-with-AWS-Lambda)
| [different](https://stackoverflow.com/questions/64457577/should-i-be-using-express-js-in-a-serverless-app)
| [reasons](https://medium.com/dailyjs/six-reasons-why-you-shouldnt-run-express-js-inside-aws-lambda-102e3a50f355). 
Povery wants to be a solution for all those issues. To achieve that, 
we strongly recommend to use it's CLI,  [povery-cli](https://github.com/sickOscar/povery-cli) 

Povery should make developing full web applications on AWS Lambda way easier by 
introducing concepts like controllers, authorizers and validators, making it closer
in DX to express-like frameworks like Nestjs but avoiding the problems that may arise using
such frameworks on Lambda.

## Installation

```bash
npm i povery
```

## Using the library

#### With API Gateway Integration

If you are serving your backend through Lambda funtions, most of the times you want to 
handle proxy requests coming from API Gateway.

This is an example `index.ts` to respond to an API Gateway request:

```typescript
import {povery, controller, api} from 'povery'

@controller
class Controller {

    @api('GET', '/hello')
    sayHello() {
        return `We're povery!`
    }
}

exports.handler = povery.load(Controller);
```
This code will respond to a proxied GET request on a route named `/hello`. The response 
will be automatically prepared following what API Gateway wants in return from an
integration with a Lambda, producing the following output if tested from the AWC Console:

```
{
    headers: {},
    isBase64Encoded: false,
    statusCode: 200,
    body: "We're povery!" 
}
```
This is exaclty what API Gateway can understand to transform the integration response into
your method response.

#### With AWS Events

This is how to react to AWS events:

```typescript
// index.ts
import { povery, controller, api, forAwsEvent } from "povery";

async function handler(event, context) {
  // DO SOMETHING
}

exports.handler = povery
    .use(forAwsEvent())
    .load(handler);
```
## Middlewares

Knowing that every request in Lambda should be totally stateless, Povery uses middlewares as a way to
intercept event and context before they actually arrive to the method code. A middleware is a plain 
object with 2 functions, `setup` and `teardown`, and can be implemented like this:

```typescript
const exampleMiddleware = {
    setup: (event, context) => {
        // this code is executed BEFORE the class method
        // event and context are passed by reference and can be therefore modified
    }, 
    teardown: (event, context, executionResult, error) => {
        // this code is executed AFTER the class method
        // you can change event the final response of your execution
    }
}
```

To use such a middleware during an API handling, you can change the base code like this. 

```typescript
import {povery, controller, api} from 'povery'

@controller
class Controller {

    @api('GET', '/hello')
    sayHello() {
        return `We're povery!`
    }
}

exports.handler = povery
    .use(exampleMiddleware)
    .load(Controller);
```
You can add as many middlewares you need, they will be executed in order.
Setup and teardown functions can be async.

### Authentication

Povery **DOES NOT** handle authentication. Even if you could (and should, if your use case requires it) create a middleware for such 
a task, the best practice on AWS is to delegate API Gateway the check for the JWT token, or whatever type of authentication your 
application needs and use.

Povery likes AWS Cognito a lot, so it presumes an event structure for http requests that matches thte one that Cognito authentication provides. 

### Authorization


Povery exposes a middleware named `Authorizer` that can be used to tell the execution that this call should be considered Authenticated and 
therefore to populate the execution context with the user data, extracted from the authorizer claims.

You could use the `@acl` decorator to restrict access to a method only to certain defined roles.

```typescript
// index.ts
import {povery, controller, api, Authorizer, acl} from 'povery';

@controller
class Controller {

    // only admin can access
    @api('GET', '/hello')
    @acl(['ADMIN'])
    hello() {
        const user = Auth.getUser();
        const roles = Auth.getRoles();
        return 'hello world'
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
      roleClaim: "custom:role",
    })
  )
  .load(Controller);
```

## Routes and parameters 

Povery heavily uses decorators to allow developers to express their intentions in a declarative way while handling routes and 
parameters passed to HTTP requests.

### Handling routes

As seen before, povery makes use of the `@api` decorator to define which methods can act to what types of proxied requests.
`@api` accepts 2 parameters:
- the http method (could also be ANY)
- the routes that must be matched with this method.

This is an approach similar to express, infact the same library is used for route parsing. This means that you can handle requests 
like

```typescript
...
@api('GET', '/user/:id')
async getUserById(event:AWSApiGatewayEvent, context:RequestContext):Promise<User> {
    const userId = context.requestParams.id
...
}
```
The decorator will handle automatically the filling of the requestParams object into context with the corresponding actual 
parameters passed to the request. What you see here is a basic simple approach, the best way to handle request parameters is
by using decorators.


### Handling request parameters

Request parameters could come in different ways: path parameters, query parameters, request body, headers...

Many decorators are available to fill and validate DTOs and they can be applied to the parameters of the API method.
The validation logic is provided by the library `class-validator`. Here's a list of the available decorators:


#### `@body` 
This decorator handles the body of the request while serving POST, PUT and PATCH requests. It is very useful 
to validate the request body and to properly type it. It accepts an object in the following format:

  ```typescript
  {
      transform?: (...args) => any, // the transform function used to transform the raw data to a DTO
      validate?: boolean // we can instruct Povery to perform a validation on the DTO based on its class-validator decorators
  }
  ```
Here an example usage:

````typescript
    @api('PATCH', '/user/:id')
    async updateUser(
        event: any,
        context: any,
        @body({transform: (event: any) => UserDto.fromObject(event), validate: true}) userDto: UserDto,
    ): Promise<any>> {
        // userDto here is the output of the transfrom function given
        ...
    }
    ```
````
You can check the [full example here]().

#### `@pathParam`
This decorator handles path parameters of the request. It is a better way of the one seen before to reach and validate the 
paramenters on the path of the request. It acceps and object in the following format:

```typescript
{
    name: string; // the name of the parameter
    transform?:  (...args) => any, // the transform function used to transform the raw value into an usable one
    validators?: PropertyDecorator[]; // the validators to be used
}
```
Here's an example:

````typescript
    @api('PATCH', '/user/:id')
    async updateUser(
        event: any,
        context: any,
        @pathParam({name: 'id', validators: [IsUUID('4')]}) id: string
    ): Promise<ResponseDto<DeviceDto[]>> {
        // id here is populated with the :id part of the url and validated as UUID v4
    }
    ```
````

You can check the [full example here]()

#### `@queryParam`

This decorator handles a single query params. It matches the url and if it finds a param with the given name, it populates 
(and validate) the corresponding field. It accepts an object in the following format:

```typescript
{
    name: string; // the name of the parameter
    transform?:  (...args) => any, // the transform function used to transform the raw value into an usable one
    validators?: PropertyDecorator[]; // the validators to be used
}
```

Here's an example:

````typescript
@api('GET', '/user')
async getUser(
    event: any,
    context: any,
    @queryParam({name: 'id', validators: [IsUUID('4')]}) id: string
): Promise<any>> {
    // id here is populated with the value of ?id={value} of the url
    ...
}
````
You can check the [full example here]()


#### `@queryParams`

This decoratos handles all query params at once. It is very helpful when you have a decent number of
query parameters, like in a filtering or pagination scenario. It accepts an object in the following format:

```typescript
{
    transform?: (...args) => any, // the transform function used to transform the raw data to a DTO
    validate?: boolean // we can instruct Povery to perform a validation on the DTO based on its class-validator decorators
}
```

Here's an example:

```typescript
```

You can check the [full example here]()

#### `@autowiredParam`

It can be used to create custom decorators. A function with the following signature must be provided:
  ```typescript
  (...args) => any;
  ```
  where `...args` is the array of the API method parameters and the returned value will be the one to which the resulting parameter will be set to.

Here's an example:

````typescript
    @api('PATCH', '/user/:id')
    async updateUser(
        event: any,
        context: any,
        @autowiredParam(() => 'Hi mom') customParameter: string,
    ): Promise<ResponseDto<DeviceDto[]>> {
        console.log(customParameter); // prints "Hi mom"
        ...
    }
    ```
````

### Validation

Povery uses [class-validator](https://www.npmjs.com/package/class-validator) library to implement validation of parameters

## Logging

You can set the environment variable `LOG_LEVEL` to `DEBUG` to have more information on function execution. This will log the incoming event and more, so be careful with secrets and aws cloudwatch costs.

## Typescript configuration

Since povery makes heavy use of decorators, your `tsconfig.json` file should have the following compiler
options enabled:

```
{
    "compilerOptions": {
        ...
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        ...
    }
}
``` 
## Testing

To test code developed with povery, you need to sorround the execution of every test with an `ExecutionContext`. To do so, 
povery exposes the funtion "withContext". This is the content of the execution you usually reach by calling `get` 
methon on `ExecutionContext`.

Here's an example of how to use it:

```typescript
describe('Unit to test', () => {

    it ('should do something', withContext(
        {
            user: {
                "email": "test@email.com"
            {
        },
        async () => {
            // do your testing here
        }
    )

});


```


## Contributing
Feel free to open issues and pull requests.

## License
MIT
