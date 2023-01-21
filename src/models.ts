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

export type S3Event = LambdaS3Event;