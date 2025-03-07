import {forAwsEvent, povery} from "../src/povery";
import {acl, api, controller} from "../src/decorators";
import {PoveryError} from "../src/povery_error";
import {Authorizer} from "../src/main";

// Remove the mock since it's now in jest.setup.js

describe('povery', () => {

    describe('Sequential execution', () => {
    
        it('should always execute setup and teardown for every middleware', async () => {

            @controller
            class SeqControoller {
                @api("GET", "/seq")
                async seq() {
                    return {
                        exit: 'ok'
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/seq'
            }

            const middleware = {
                setup: (event:any, context: any) => {
                    console.log('setup');
                },
                teardown: (event:any, context:any, result:any) => {
                    console.log('teardown');
                }
            }

            jest.spyOn(middleware, 'setup');
            jest.spyOn(middleware, 'teardown');

            const handler = povery.use(middleware).load(SeqControoller);
            await handler(httpEvent, {});

            const handler2 = povery.use(middleware).load(SeqControoller);
            await handler2(httpEvent, {});

            const handler3 = povery.use(middleware).load(SeqControoller);
            await handler3(httpEvent, {});

            expect(middleware.setup).toHaveBeenCalledTimes(3);
            expect(middleware.teardown).toHaveBeenCalledTimes(3);
        });

        it('should execute multiple middlewares in a single handler', async () => {
            @controller
            class MultiMiddlewareController {
                @api("GET", "/multi")
                async multi() {
                    return {
                        result: 'success'
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/multi'
            }

            const middleware1 = {
                setup: jest.fn(),
                teardown: jest.fn()
            };

            const middleware2 = {
                setup: jest.fn(),
                teardown: jest.fn()
            };

            const handler = povery
                .use(middleware1)
                .use(middleware2)
                .load(MultiMiddlewareController);
            
            await handler(httpEvent, {});

            expect(middleware1.setup).toHaveBeenCalledTimes(1);
            expect(middleware1.teardown).toHaveBeenCalledTimes(1);
            expect(middleware2.setup).toHaveBeenCalledTimes(1);
            expect(middleware2.teardown).toHaveBeenCalledTimes(1);
        });

        it('should execute middlewares in the correct order', async () => {
            @controller
            class OrderController {
                @api("GET", "/order")
                async order() {
                    return {
                        result: 'success'
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/order'
            }

            const executionOrder: string[] = [];

            const middleware1 = {
                setup: () => {
                    executionOrder.push('middleware1-setup');
                },
                teardown: () => {
                    executionOrder.push('middleware1-teardown');
                }
            };

            const middleware2 = {
                setup: () => {
                    executionOrder.push('middleware2-setup');
                },
                teardown: () => {
                    executionOrder.push('middleware2-teardown');
                }
            };

            const handler = povery
                .use(middleware1)
                .use(middleware2)
                .load(OrderController);
            
            await handler(httpEvent, {});

            // Setup should be executed in order: middleware1 then middleware2
            expect(executionOrder[0]).toBe('middleware1-setup');
            expect(executionOrder[1]).toBe('middleware2-setup');
            
            // Teardown should be executed in reverse order: middleware2 then middleware1
            expect(executionOrder[2]).toBe('middleware2-teardown');
            expect(executionOrder[3]).toBe('middleware1-teardown');
        });

        it('should allow middlewares to modify event and context', async () => {
            @controller
            class ModifyController {
                @api("GET", "/modify")
                async modify(event: any, context: any) {
                    return {
                        customHeader: context.customHeader,
                        customEventProp: event.customProp
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/modify'
            }

            const modifyMiddleware = {
                setup: (event: any, context: any) => {
                    // Modify event and context
                    event.customProp = 'event-modified';
                    context.customHeader = 'context-modified';
                }
            };

            const handler = povery
                .use(modifyMiddleware)
                .load(ModifyController);
            
            const result = await handler(httpEvent, {});
            const body = JSON.parse(result.body);
            
            expect(body.customHeader).toBe('context-modified');
            expect(body.customEventProp).toBe('event-modified');
        });

        it('should handle errors in middlewares', async () => {
            @controller
            class ErrorController {
                @api("GET", "/error")
                async error() {
                    return {
                        result: 'success'
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/error'
            }

            const errorMiddleware = {
                setup: () => {
                    throw new Error('Middleware error');
                }
            };

            const handler = povery
                .use(errorMiddleware)
                .load(ErrorController);
            
            const result = await handler(httpEvent, {});
            
            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).errorMessage).toBe('Middleware error');
        });

        it('should support async middlewares', async () => {
            @controller
            class AsyncController {
                @api("GET", "/async")
                async asyncMethod(event: any, context: any) {
                    return {
                        asyncValue: context.asyncValue
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/async'
            }

            const asyncMiddleware = {
                setup: async (event: any, context: any) => {
                    // Simulate async operation
                    await new Promise(resolve => setTimeout(resolve, 10));
                    context.asyncValue = 'async-value';
                },
                teardown: async (event: any, context: any, result: any) => {
                    // Simulate async operation
                    await new Promise(resolve => setTimeout(resolve, 10));
                    // Could modify result here if needed
                }
            };

            const handler = povery
                .use(asyncMiddleware)
                .load(AsyncController);
            
            const result = await handler(httpEvent, {});
            const body = JSON.parse(result.body);
            
            expect(body.asyncValue).toBe('async-value');
        });

        it('should work with AWS events (non-HTTP)', async () => {
            // Handler function for AWS events
            async function awsEventHandler(event: any, context: any) {
                return {
                    processed: true,
                    contextValue: context.customValue,
                    eventValue: event.Records[0].customValue
                };
            }

            // Mock S3 event
            const s3Event = {
                Records: [
                    {
                        eventSource: 'aws:s3',
                        s3: {
                            bucket: { name: 'test-bucket' },
                            object: { key: 'test-key' }
                        }
                    }
                ]
            };

            const awsEventMiddleware = {
                setup: (event: any, context: any) => {
                    // Add custom values to event and context
                    event.Records[0].customValue = 'event-value';
                    context.customValue = 'context-value';
                }
            };

            const handler = povery
                .use(forAwsEvent())
                .use(awsEventMiddleware)
                .load(awsEventHandler);
            
            const result = await handler(s3Event, {});
            
            expect(result.processed).toBe(true);
            expect(result.contextValue).toBe('context-value');
            expect(result.eventValue).toBe('event-value');
        });

        it('should allow middlewares to modify the response', async () => {
            @controller
            class ResponseController {
                @api("GET", "/response")
                async getResponse() {
                    return {
                        original: 'data'
                    };
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/response'
            };

            const responseMiddleware = {
                setup: () => {
                    // No setup needed
                },
                teardown: (event: any, context: any, result: any) => {
                    // Modify the response
                    const body = JSON.parse(result.body);
                    body.modified = true;
                    body.timestamp = 'test-timestamp';
                    
                    return {
                        ...result,
                        headers: {
                            ...result.headers,
                            'X-Custom-Header': 'custom-value'
                        },
                        body: JSON.stringify(body)
                    };
                }
            };

            const handler = povery
                .use(responseMiddleware)
                .load(ResponseController);
            
            const result = await handler(httpEvent, {});
            const body = JSON.parse(result.body);
            
            expect(body.original).toBe('data');
            expect(body.modified).toBe(true);
            expect(body.timestamp).toBe('test-timestamp');
            expect(result.headers['X-Custom-Header']).toBe('custom-value');
        });

        it('should support function-style middleware', async () => {
            @controller
            class FunctionMiddlewareController {
                @api("GET", "/function-middleware")
                async getData(event: any, context: any) {
                    return {
                        middlewareValue: context.middlewareValue
                    };
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/function-middleware'
            };

            // Function-style middleware
            const functionMiddleware = (event: any, context: any) => {
                context.middlewareValue = 'function-middleware-value';
            };

            const handler = povery
                .use(functionMiddleware)
                .load(FunctionMiddlewareController);
            
            const result = await handler(httpEvent, {});
            const body = JSON.parse(result.body);
            
            expect(body.middlewareValue).toBe('function-middleware-value');
        });
    });
});