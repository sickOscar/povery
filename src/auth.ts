import {ExecutionContext} from "./execution_context";
import assert from "assert";
import {endTimer, endXRayTracing, startTimer, startXRayTracing} from "./util";
import {isRPC} from "./povery";
import {PoveryError} from "./povery_error";
import {APIGatewayEventRequestContextWithAuthorizer} from "aws-lambda";
import {getRoute} from "./route_extractor";
import {PoveryMiddleware, PoveryUser} from "./models";

interface AuthorizerOptions {
    // if this is set, the role of  the user will be taken from this claim and the groups
    // won't be considered
    roleClaim?: string;
}

export const authMiddleware = (controller:any, options?:AuthorizerOptions): PoveryMiddleware => {

    const authOptions:AuthorizerOptions = {
        ...options
    }

    return {
        setup: async (event, context) => {
            const startAuthTime = startTimer();
            await runAuthorization(context, event, controller, authOptions);
            endTimer(startAuthTime, 'povery.auth');
        },
        teardown: async () => {

        }
    }

}

export async function runAuthorization(context, event, controller, options:AuthorizerOptions): Promise<any> {

    const authSegment = startXRayTracing("povery.authorization");

    if (isRPC(event, context)) {
        // do nothing at the moment, no ACL on RPC
        endXRayTracing(authSegment);
        return;
    }


    assert(event.requestContext, "No requestContext found");

    loadCognitoIdentityInRequestContext(event.requestContext, options);

    if (isRPC(event, context)) {
        // do nothing at the moment, no ACL on RPC
    } else {
        // this controller call is tricky because we need the decorator to be fired at least once
        // to be able to define a static property on the controller class
        new controller();
        const route = getRoute(controller, event.httpMethod, event.path);
        checkRestAcl(controller, route.controllerMethod, Auth.getRoles());
    }

    ExecutionContext.set('authDone', true);

    endXRayTracing(authSegment);
    return context;

}

function checkRestAcl(controller, controllerMethod: string, roles: string[]) {

    // let it go if no ACL is defined
    if (!controller.__ACL__ || !controller.__ACL__[controllerMethod]) {
        return;
    }

    // check if the user has at least one of the roles required
    for (const role of roles) {
        if (controller.__ACL__[controllerMethod].indexOf(role) !== -1) {
            return;
        }
    }
    throw new PoveryError("Unauthorized access (REST)", 403);
}

function validateAuthorizerContent(requestContext) {
    assert(requestContext.authorizer, "Bootloader - No authorizer found");
    const claims = requestContext.authorizer.claims;
    assert(claims, "Bootloader - No claims found");
}

function loadCognitoIdentityInRequestContext(requestContext: APIGatewayEventRequestContextWithAuthorizer<any>, options?:AuthorizerOptions): void {

    validateAuthorizerContent(requestContext);

    const claims = requestContext.authorizer.claims;

    ExecutionContext.set(`user`, {...claims})

    if (options?.roleClaim) {
        ExecutionContext.set(`roles`, [claims[options.roleClaim]])
    } else {
        ExecutionContext.set(`roles`, claims['cognito:groups'] || [])
    }

}

export const Auth = {
    getUser: function (): PoveryUser {
        return ExecutionContext.get('user');
    },
    getRoles: function (): string[] {
        return ExecutionContext.get('roles');
    }
}