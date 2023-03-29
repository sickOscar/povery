import {
    APIGatewayEventRequestContextWithAuthorizer,
    Context as LambdaInvocationContext,
    S3Event as LambdaS3Event
} from "aws-lambda";

export interface BaseHTTPResponse {
    headers: {
        'Access-Control-Allow-Origin': string;
        'Access-Control-Allow-Headers': string;
        'Access-Control-Allow-Methods': string;
    };
    isBase64Encoded: boolean;
    statusCode: number;
    body: string;
}

export interface ErrorContent {
    errorMessage: string;
    errorData: any;
}

export interface MatchingRoute {
    controllerMethod: string;
    params: any;
}

export interface PoveryUser {
    sub: string;
    username: string;
    [key:string]: string | number | string[]
}

export type Context = LambdaInvocationContext & {
    requestParams: any;
}
export type APIGatewayEvent = APIGatewayEventRequestContextWithAuthorizer<any> & {
    body: string;
    requestContext: any;
};

export interface PoveryResult {
    headers: {[key: string]: string};
    isBase64Encoded: boolean;
    statusCode: number;
    body: string;
}

export type PoveryMiddlewareFn = (event, context) => void;

export interface PoveryMiddlewareObject {
    setup?: (event, context) => Promise<void> | void;
    teardown?: (event, context, result, err) => Promise<PoveryResult> | PoveryResult;
}

export type PoveryMiddleware = PoveryMiddlewareFn | PoveryMiddlewareObject;

export type S3Event = LambdaS3Event;