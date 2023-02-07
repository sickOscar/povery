import {Subsegment} from 'aws-xray-sdk';
import * as _ from 'lodash';
import xss from 'xss';
import {runAuthorization} from './auth';
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
    forAwsEvent: () => PoveryFn;
    use: (middleware) => PoveryFn;
}

const poveryFn:PoveryFn = function() {
} as unknown as PoveryFn;

poveryFn.load = function(controller): (event: any, context: any) => Promise<any> {
    return async (event: any, context: any) => {

        const subsegment = setup(context, event, this.middlewares || []);

        const functionResults = await runNewExecutionContext(async () => {
            const startTime = startTimer();
            try {

                // @ts-ignore
                if (this.auth) {
                    const startAuthTime = startTimer();
                    context = await runAuthorization(context, event, controller);
                    endTimer(startAuthTime, 'povery.auth');
                }

                // @ts-ignore
                if (this.awsEvent) {
                    context = await enhanceContextForAwsEvent(context, event, controller);
                }

                return await runFunction(event, context, controller);
            } catch (err: any) {
                return await handleExecutionError(err, event);
            } finally {
                endTimer(startTime, 'povery.load');
            }

        });

        await teardown(subsegment, this.middlewares || []);

        return functionResults;
    }
}

poveryFn.clean = function() {
    // @ts-ignore
    this.auth = false;
    // @ts-ignore
    this.awsEvent = false;
    // @ts-ignore
    this.middlewares = [];
}

poveryFn.withAuth = function() {
    // @ts-ignore
    this.auth = true;
    return this;
}

poveryFn.forAwsEvent = function() {
    // @ts-ignore
    this.awsEvent = true;
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



function enhanceContextForAwsEvent(context, _event, _controller) {
    return {
        ...context,
        isAwsEvent: true,
    };
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

function setup(context, event, middlewares) {
    const subsegment = startXRayTracing('povery.load');

    setupStage(context);
    logEnvironment(event);

    middlewares.forEach((middleware) => {
        if (typeof middleware === 'function') {
            middleware(event, context);
        } else {
            middleware.setup(event, context);
        }
    })

    return subsegment;
}

async function teardown(subsegment: undefined | Subsegment, middlewares) {
    endXRayTracing(subsegment);
    middlewares.forEach((middleware) => {
        if (typeof middleware !== 'function' && middleware.teardown) {
            middleware.teardown();
        }
    });
}

function logEnvironment(event) {
    console.log('Stage:', process.env.deploymentStage);
    console.log(`Node Environment: ${process.env.NODE_ENV}`);
    if (event.httpMethod) {
        console.log('Event:', filterPassword(JSON.stringify(event.body)));
    } else {
        console.log('Event:', filterPassword(JSON.stringify(event)));
    }
}

function runNewExecutionContext(fn) {
    const requestContext = ExecutionContext.getExecutionContext();
    return requestContext.run(new Map(), fn);
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

function validateInputs(event, controller) {
    const parent = Object.getPrototypeOf(controller);
    const controllerMethods = Object.getOwnPropertyNames(parent.prototype);

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
    };

    // hack for serverless local run, emulate lambda_proxy integration
    // return localDevelopmentHacksOnTheError(content);
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
    if (isEvent(context)) {
        return false;
    }
    return !event.httpMethod;
}

async function execFunctionHandler(controller, event, context): Promise<BaseHTTPResponse> {
    console.log(`HttpMethod`, event.httpMethod);

    let result;

    if (isRPC(event, context)) {

        const instance = new controller();
        // with RPC calls, only the payload matters fr the execution, not the entire event
        let {action, payload} = getRPCActionAndPayload(event);
        result = await instance[action].call(controller, payload, context);

    } else if (isEvent(context)) {

        result = await controller.call(controller, event, context);

    } else {
        const instance = new controller();

        const matchingRoute = getRoute(controller, event.httpMethod, event.path);
        context.requestParams = matchingRoute.params;

        const startExecution = startTimer();
        result = await instance[matchingRoute.controllerMethod].call(instance, event, context);
        endTimer(startExecution, "Controller exec time");
    }

    if (isRPC(event, context) || isEvent(context)) {
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

function isEvent(context) {
    return context.isAwsEvent;
}

const filterPassword = (s) => {
    if (!s) return '';
    return s.replace(/"password":"(.*?)"/, function (_a, _b) {
        return '"password"="__PSW__"';
    });
};


export const povery = poveryFn;