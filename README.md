
# Povery

#### Povery is a framework for building things on AWS Lambda with Typescript.

It's heavily opinionated.

You can serve many lambdas as an http server, or you can invoke them locally from the terminal. 

Unlike other things like this, it does not want to create lamdas for you (just deploy them, if you wish)

## Rules

- Every lambda has a named folder under `lambda` folder. 
- The entrypoint of the lambda MUST BE `index.ts` file.
- Lambdas that serve API Gateway SHOULD BE prefixed with `API_` (e.g. `API_Something`) and start with a capital letter.
- Lambdas that serve ant other events SHOULD BE prefixed with `EVENT_` (e.g. `EVENT_Something`) and start with a capital letter.
- API Gateway MUST USE proxy integration to respond to api request.

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