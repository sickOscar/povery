import {Subsegment} from 'aws-xray-sdk';
import * as _ from 'lodash';
import xss from 'xss';
import {ExecutionContext} from './execution_context';
import * as util from './util';
import {endTimer, endXRayTracing, startTimer, startXRayTracing} from './util';
import assert from "assert";
import {BaseHTTPResponse, ErrorContent, PoveryMiddleware} from "./models";
import {getRoute} from "./route_extractor";

const Validator = require('jsonschema').Validator;

interface PoveryFn {
    middlewares: PoveryMiddleware[];
    load: (controller) => (event: any, context: any) => Promise<any>;
    clean: () => void;
    withAuth: () => PoveryFn;
    use: (middleware) => PoveryFn;
}

const poveryFn:PoveryFn = function() {
} as unknown as PoveryFn;

poveryFn.load = function(controller): (event: any, context: any) => Promise<any> {
    // Store middlewares at handler creation time
    const handlerMiddlewares = [...(this.middlewares || [])];
    
    // DO NOT SHORTEN
    return async (event: any, context: any) => {
        return runNewExecutionContext(async () => {

            let xRaySegment: Subsegment | undefined;
            const startTime = startTimer();
            let err = null;
            let executionResult;
            let result;
            try {
                // Use the stored middlewares for each invocation
                xRaySegment = await setup(context, event, handlerMiddlewares);
                executionResult = await runFunction(event, context, controller);
            } catch (e: any) {
                console.log(`err`, e)
                err = e;
                executionResult = await handleExecutionError(e, event);
            } finally {
                // Use the stored middlewares for teardown
                result = await teardown(xRaySegment, handlerMiddlewares, context, event, executionResult, err);
                // Reset middlewares for the povery instance
                this.clean();
                endTimer(startTime, 'povery.load');
            }
            return result;
        });
    }
}

poveryFn.clean = function() {
    // @ts-ignore
    this.auth = false;
    // @ts-ignore
    this.awsEvent = false;
    // @ts-ignore
    this.middlewares = [];
    return this;
}

poveryFn.use = function(middleware) {
    if (!this.middlewares) {
        // @ts-ignore
        this.middlewares = [];
    }

    this.middlewares.push(middleware);
    return this;
}

export function forAwsEvent<EventType>() {
    return {
        setup: async (event, context) => {
            context.isAwsEvent = true;
        }
    }
}

async function handleExecutionError(err: any, event): Promise<BaseHTTPResponse | ErrorContent> {
    logError(err);
    const cleanedError = cleanError(err);

    if (!event.httpMethod) {
        return cleanedError;
    }

    return {
        headers: generateCorsHeaders(),
        isBase64Encoded: false,
        statusCode: err.statusCode || 500,
        body: JSON.stringify(cleanedError),
    };
}

async function setup(context, event, middlewares):Promise<Subsegment | undefined> {
    const subsegment = startXRayTracing('povery.load');

    setupStage(context);
    logEnvironment(event);

    for (let middleware of middlewares) {
        if (typeof middleware === 'function') {
            await middleware(event, context);
        } else if (middleware.setup) {
            await middleware.setup(event, context);
        }
    }

    return subsegment;
}

async function teardown(subsegment: undefined | Subsegment, middlewares, context, event, result, err) {
    endXRayTracing(subsegment);
    let finalResult = result;
    let reversedMiddlewares = [...middlewares].reverse();
    for (let middleware of reversedMiddlewares) {
        if (typeof middleware !== 'function' && middleware.teardown) {
            const teardownResult = await middleware.teardown(event, context, finalResult, err);
            // If the teardown logic returns void or an undefined object
            // we ignore that result and return the executionResult instead.
            // null objects are perfectly fine though.
            if (teardownResult !== undefined) {
                finalResult = teardownResult;
            }
        }
    }
    return finalResult;
}

function logEnvironment(event) {
    if (process.env.LOG_LEVEL === "DEBUG") {
        console.log('Stage:', process.env.deploymentStage);
        console.log(`Node Environment: ${process.env.NODE_ENV}`);
        if (event.httpMethod?.toLowerCase() === 'post' || event.httpMethod?.toLowerCase() === 'put') {
            console.log('Event:', filterPassword(JSON.stringify(event.body)));
        } else {
            console.log('Event:', filterPassword(JSON.stringify(event)));
        }
    }
}

export function runNewExecutionContext(fn, defaultContext: null | Map<string, any> = null) {
    const requestContext = ExecutionContext.getExecutionContext();
    if (defaultContext) {
        return requestContext.run(defaultContext, fn);
    } else {
        return requestContext.run(new Map(), fn);
    }
}

function checkXss(event) {
    const parsedEvent = JSON.parse(JSON.stringify(event));

    if (_.isNil(parsedEvent.payload)) {
        return parsedEvent;
    }

    let securedPayload = {};
    // check for xss
    Object.entries(parsedEvent.payload).forEach(([key, value]) => {
        const newKey = xss(key);
        let newValue = value;
        if (typeof value === 'string') {
            newValue = xss(value);
        }
        securedPayload[newKey] = newValue;
    });
    parsedEvent.payload = securedPayload;

    return parsedEvent;
}

function applyControllerValidator(controller, event) {
    if (controller.validator && controller.validator[event.action]) {
        const v = new Validator({
            throwError: false,
        });
        const validation = v.validate(event.payload, controller.validator[event.action]);
        if (!validation.valid) {
            throw new Error(validation.errors.map((e) => e.message).join('\n'));
        }
    }
}

function validateInputs(event, controller:Function) {

    const proto = Object.getPrototypeOf(controller);
    debugger;

    assert(proto.prototype, "Unable to get controller methods. Did you pass a class to povery.load?")

    const controllerMethods = Object.getOwnPropertyNames(proto.prototype);

    const {action} = getRPCActionAndPayload(event);

    assert(action, "No action given")

    if (!controllerMethods.includes(action)) {
        throw new Error('Action not found');
    }

    // applyControllerValidator(controller, event);

    return checkXss(event);
}



function setupStage(_context) {
    const allowedStages = ['prod', 'staging'];
    // var stage = context.invokedFunctionArn.split(':').pop();
    const stage = `${process.env.LAMBDA_ENV}`;
    if (allowedStages.indexOf(stage) > -1) {
        process.env.deploymentStage = stage;
    } else {
        process.env.deploymentStage = 'dev';
    }
}

function runFunction(event, context, controller): Promise<any> {
    let securedEvent = event;

    if (isRPC(event, context)) {
        securedEvent = validateInputs(event, controller);
    }

    return execFunctionHandler(controller, securedEvent, context);
}

function logError(err: any) {
    console.log(err && err.stack ? err.stack : err);
}

function cleanError(err: any): ErrorContent {
    let error = err;
    if (err.message) {
        error = err.message;
    }

    if (util.isProduction()) {
        error = 'Internal server error';
    }

    return {
        errorMessage: error,
        errorData: err.errorData ? err.errorData : undefined,
    };

}

function getRPCActionAndPayload(event) {
    let action: string;
    let payload: any;

    try {
        ({action, payload} = JSON.parse(event.body));
    } catch (err) {
        ({action, payload} = event);
    }
    return {action, payload};
}

export function isRPC(event, context) {
    if (isAwsEvent(context)) {
        return false;
    }
    return !event.httpMethod;
}

async function execFunctionHandler(controller, event, context): Promise<BaseHTTPResponse> {
    if (process.env.LOG_LEVEL === "DEBUG") {
        console.log(`HttpMethod`, event.httpMethod);
    }

    let result;

    if (isRPC(event, context)) {

        const instance = new controller();
        // with RPC calls, only the payload matters for the execution, not the entire event
        let {action, payload} = getRPCActionAndPayload(event);
        result = await instance[action].call(controller, payload, context);

    } else if (isAwsEvent(context)) {

        result = await controller.call(controller, event, context);

    } else {
        const instance = new controller();

        // AWS HTTP APIs keeps stage name in path. We need to remove it to match the route
        const apiStage = event.requestContext?.stage;
        let apiPath = event.path;
        console.log(`API Stage: ${apiStage}`);
        if (apiPath.startsWith(`/${apiStage}`)) {
            console.log(`Removing stage from path`);
            apiPath = apiPath.replace(`/${apiStage}`, '');
        }
        console.log(`API Path: ${apiPath}`);

        const matchingRoute = getRoute(controller, event.httpMethod, apiPath);
        context.requestParams = matchingRoute.params;

        const startExecution = startTimer();
        result = await instance[matchingRoute.controllerMethod].call(instance, event, context);
        endTimer(startExecution, "Controller exec time");
    }

    if (isRPC(event, context) || isAwsEvent(context)) {
        return result
    }

    return {
        headers: generateCorsHeaders(),
        isBase64Encoded: false,
        statusCode: 200,
        body: JSON.stringify(result),
    };
}

function generateCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE,PATCH',
    };
}

function isAwsEvent(context) {
    return context.isAwsEvent;
}

const filterPassword = (s) => {
    if (!s) return '';
    return s.replace(/"password":"(.*?)"/, function (_a, _b) {
        return '"password"="__PSW__"';
    });
};


export const povery = poveryFn;