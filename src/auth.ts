import {ExecutionContext} from "./execution_context";
import assert from "assert";
import {endXRayTracing, startXRayTracing} from "./util";
import {isRPC} from "./povery";
import {PoveryError} from "./povery_error";
import {APIGatewayEventRequestContextWithAuthorizer} from "aws-lambda";
import {getRoute} from "./route_extractor";

export async function runAuthorization(context, event, controller): Promise<any> {

    const authSegment = startXRayTracing("povery.authorization");

    assert(event.requestContext, "No requestContext found");

    const identity = await loadCognitoIdentityInRequestContext(event.requestContext);

    context.identityData = identity;
    context.customer = identity.customer;

    if (isRPC(event, context)) {
        // do nothing at the moment, no ACL on RPC
    } else {
        // this controller call is tricky because we need the decorator to be fired at least once
        // to be able to define a static property on the controller class
        new controller();
        const route = getRoute(controller, event.httpMethod, event.path);
        checkRestAcl(controller, route.controllerMethod, identity.role);
    }

    ExecutionContext.set('authDone', true);

    endXRayTracing(authSegment);
    return context;

}

function checkRestAcl(controller, controllerMethod:string, role:string) {
    // let it go if no ACL is defined
    if (!controller.__ACL__ || !controller.__ACL__[controllerMethod]) {
        return;
    }
    if (controller.__ACL__[controllerMethod].indexOf(role) === -1) {
        throw new PoveryError("Unauthorized access (REST)", 403);
    }
}

function validateAuthorizerContent(requestContext) {
    assert(requestContext.authorizer, "Bootloader - No authorizer found");
    const claims = requestContext.authorizer.claims;
    assert(claims, "Bootloader - No claims found");
}

async function loadCognitoIdentityInRequestContext(requestContext:APIGatewayEventRequestContextWithAuthorizer<any>) {

    validateAuthorizerContent(requestContext);

    const claims = requestContext.authorizer.claims;

    ExecutionContext.set('customer', claims['custom:customer']);
    ExecutionContext.set('user', {
        username: claims['cognito:username'],
        sub: claims.sub,
        customer: claims['custom:customer'],
        email: claims.email,
        role: claims['custom:role']
    })


    return {
        customer: claims['custom:customer'],
        role: claims['custom:role']
    }

}
