import {APIGatewayEventRequestContextWithAuthorizer, Context as LambdaInvocationContext} from "aws-lambda";
import {S3Event as LambdaS3Event} from "aws-lambda";
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

export type Context = LambdaInvocationContext & {
    requestParams: any;
}
export type APIGatewayEvent = APIGatewayEventRequestContextWithAuthorizer<any> & {
    body: string;
    requestContext: any;
};

export type PoveryMiddlewareFn = (event, context) => void;

export interface PoveryMiddlewareObject {
    setup?: (event, context) => void;
    teardown?: () => void;
}

export type PoveryMiddleware = PoveryMiddlewareFn | PoveryMiddlewareObject;

export type S3Event = LambdaS3Event;