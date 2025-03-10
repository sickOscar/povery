import {forAwsEvent, povery, runNewExecutionContext} from "../src/povery";
import {acl, api, controller} from "../src/decorators";
import {PoveryError} from "../src/povery_error";
import {Authorizer} from "../src/main";
import {ExecutionContext} from "../src/execution_context";

describe('povery', () => {

    afterEach(() => {
        povery.clean();
    })

    it('should be defined', () => {
        expect(povery).toBeDefined();
    });

    it('should have a load method', () => {
        expect(povery.load).toBeDefined();
    })

    it('load forAwsEvent should return a function', () => {
        expect(povery.use(forAwsEvent()).load).toBeDefined();
    })

    it('load withAuth should return a function', () => {
        expect(povery.use(Authorizer({})).load).toBeDefined();
    });

    describe('RPC', () => {
        it('loaded function should fail if no action is given', async () => {
            @controller
            class EmptyController {}
            
            const fn = povery.load(EmptyController);
            await expect(fn({}, {})).resolves.toMatchObject({
                errorMessage: expect.stringContaining("No action given"),
            });
        });

        it('loaded function should fail if action is not in the controller', async () => {
            @controller
            class TestController {
                validAction() {
                    return "valid";
                }
            }
            const fn = povery.load(TestController);
            await expect(fn({
                action: "invalidAction"
            }, {})).resolves.toMatchObject({
                errorMessage: expect.stringContaining("Action not found"),
            });
        });

        it('should execute the correct action when provided', async () => {
            @controller
            class TestController {
                testAction() {
                    return { result: "success" };
                }
            }
            const fn = povery.load(TestController);
            await expect(fn({
                action: "testAction",
                payload: {}
            }, {})).resolves.toEqual({ result: "success" });
        });
    });

    describe('forAwsEvent', () => {
        it('loaded function should fire', async () => {
            const fn = povery.use(forAwsEvent()).load(() => {
                return {
                    "CIAOSSA": "CIAOSSA"
                }
            });
            await expect(fn({}, {})).resolves.toStrictEqual({
                "CIAOSSA": "CIAOSSA"
            });
        });

        it('should pass event and context to the handler', async () => {
            const fn = povery.use(forAwsEvent()).load((event, context) => {
                return {
                    receivedEvent: event,
                    receivedContext: context
                }
            });
            
            const testEvent = { test: "event" };
            const testContext = { test: "context" };
            
            const result = await fn(testEvent, testContext);
            expect(result.receivedEvent).toEqual(testEvent);
            expect(result.receivedContext.test).toEqual("context");
            expect(result.receivedContext.isAwsEvent).toBe(true);
        });
    });

    describe('httpRequest', () => {
        it('loaded controller should match the route and exec the corresponding method', async () => {
            @controller
            class testController {
                @api('GET', '/test')
                test() {
                    return {
                        exit: 'ok'
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/test'
            };
            const handler = povery.load(testController)
            await expect(handler(httpEvent, {})).resolves.toStrictEqual({
                body: JSON.stringify({exit: 'ok'}),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH",
                },
                "isBase64Encoded": false,
                "statusCode": 200
            })
        });

        it('should handle path parameters correctly', async () => {
            @controller
            class testController {
                @api('GET', '/users/:id')
                getUser(event, context) {
                    return {
                        userId: context.requestParams.id
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/users/123'
            };
            const handler = povery.load(testController);
            await expect(handler(httpEvent, {})).resolves.toMatchObject({
                body: JSON.stringify({userId: '123'}),
                statusCode: 200
            });
        });

        it('should handle API stage in path correctly', async () => {
            @controller
            class testController {
                @api('GET', '/test')
                test() {
                    return {
                        exit: 'ok'
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/dev/test',
                requestContext: {
                    stage: 'dev'
                }
            };
            const handler = povery.load(testController);
            await expect(handler(httpEvent, {})).resolves.toMatchObject({
                body: JSON.stringify({exit: 'ok'}),
                statusCode: 200
            });
        });

        it('should handle paths that contain the stage name as part of a resource path', async () => {
            @controller
            class testController {
                @api('GET', '/devices')
                getDevices() {
                    return {
                        result: 'devices list'
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/dev/devices',
                requestContext: {
                    stage: 'dev'
                }
            };
            const handler = povery.load(testController);
            await expect(handler(httpEvent, {})).resolves.toMatchObject({
                body: JSON.stringify({result: 'devices list'}),
                statusCode: 200
            });
        });

        it('should handle paths where stage name is not followed by a slash', async () => {
            @controller
            class testController {
                @api('GET', '/devinfo')
                getDevInfo() {
                    return {
                        result: 'dev info'
                    }
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/devinfo',
                requestContext: {
                    stage: 'dev'
                }
            };
            const handler = povery.load(testController);
            await expect(handler(httpEvent, {})).resolves.toMatchObject({
                body: JSON.stringify({result: 'dev info'}),
                statusCode: 200
            });
        });

        it('should return a 500 error if the controller method throws a generic error', async () => {
            @controller
            class testController {
                @api('GET', '/test')
                test() {
                    throw new Error('test')
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/test'
            }
            const handler = povery.load(testController)
            await expect(handler(httpEvent, {})).resolves.toStrictEqual({
                body: JSON.stringify({
                        errorMessage: 'test',
                        errorCode: 'INTERNAL_ERROR'
                    },
                ),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH",
                },
                "isBase64Encoded": false,
                "statusCode": 500
            })
        });

        it('should return a custom error code if the controller method throws a PoveryError', async () => {
            @controller
            class testController {
                @api('GET', '/test')
                test() {
                    throw new PoveryError('test', 403)
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/test'
            }
            const handler = povery.load(testController)
            await expect(handler(httpEvent, {})).resolves.toStrictEqual({
                body: JSON.stringify({
                        errorMessage: 'test',
                        errorCode: 'INTERNAL_ERROR'
                    },
                ),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH",
                },
                "isBase64Encoded": false,
                "statusCode": 403
            })
        });

        it('should include errorData in the response if provided in PoveryError', async () => {
            @controller
            class testController {
                @api('GET', '/test')
                test() {
                    throw new PoveryError('test', 400, { field: 'username', reason: 'required' })
                }
            }

            const httpEvent = {
                httpMethod: 'GET',
                path: '/test'
            }
            const handler = povery.load(testController)
            await expect(handler(httpEvent, {})).resolves.toMatchObject({
                body: JSON.stringify({
                    errorMessage: 'test',
                    errorCode: 'INTERNAL_ERROR',
                    errorData: { field: 'username', reason: 'required' }
                }),
                statusCode: 400
            });
        });

        describe('Authorizer', () => {
            it('should return a 403 error if the route is not accessible by this role', async () => {
                @controller
                class testController {
                    @api('GET', '/test')
                    @acl(['TEST_ADMIN'])
                    test() {
                        return {
                            exit: 'ok'
                        }
                    }
                }

                const httpEvent = {
                    httpMethod: 'GET',
                    path: '/test',
                    requestContext: {
                        authorizer: {
                            claims: {}
                        }
                    }
                }
                const handler = povery.use(Authorizer(testController)).load(testController)
                await expect(handler(httpEvent, {})).resolves.toStrictEqual({
                    body: JSON.stringify({
                        errorMessage: 'Unauthorized access (REST)',
                        errorCode: 'INTERNAL_ERROR'
                    }),
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH",
                    },
                    "isBase64Encoded": false,
                    "statusCode": 403
                })
            });

            it('should allow access if the user has the required role', async () => {
                @controller
                class testController {
                    @api('GET', '/test')
                    @acl(['ADMIN'])
                    test() {
                        return {
                            exit: 'ok'
                        }
                    }
                }

                const httpEvent = {
                    httpMethod: 'GET',
                    path: '/test',
                    requestContext: {
                        authorizer: {
                            claims: {
                                'cognito:groups': ['ADMIN']
                            }
                        }
                    }
                }
                const handler = povery.use(Authorizer(testController)).load(testController)
                await expect(handler(httpEvent, {})).resolves.toMatchObject({
                    body: JSON.stringify({exit: 'ok'}),
                    statusCode: 200
                });
            });
        });
    });

    describe('ExecutionContext', () => {
        it('should create a new execution context for each request', async () => {
            let contextValue = null;
            
            @controller
            class testController {
                @api('GET', '/test')
                test() {
                    contextValue = ExecutionContext.get('testKey');
                    ExecutionContext.set('testKey', 'testValue');
                    return { success: true };
                }
            }
            
            const handler = povery.load(testController);
            
            // First request
            await handler({ httpMethod: 'GET', path: '/test' }, {});
            expect(contextValue).toBeUndefined();
            
            // Second request - should have a clean context
            await handler({ httpMethod: 'GET', path: '/test' }, {});
            expect(contextValue).toBeUndefined();
        });
        
        it('should allow setting and getting values in the execution context', async () => {
            @controller
            class testController {
                @api('GET', '/test')
                test() {
                    ExecutionContext.set('testKey', 'testValue');
                    return { 
                        value: ExecutionContext.get('testKey')
                    };
                }
            }
            
            const handler = povery.load(testController);
            
            await expect(handler({ httpMethod: 'GET', path: '/test' }, {}))
                .resolves.toMatchObject({
                    body: JSON.stringify({ value: 'testValue' })
                });
        });
        
        it('should support runNewExecutionContext with default context', async () => {
            let result = null;
            
            await runNewExecutionContext(async () => {
                ExecutionContext.set('testKey', 'testValue');
                result = ExecutionContext.get('testKey');
            });
            
            expect(result).toBe('testValue');
        });
        
        it('should support runNewExecutionContext with provided context', async () => {
            let result = null;
            const defaultContext = new Map([['testKey', 'initialValue']]);
            
            await runNewExecutionContext(async () => {
                result = ExecutionContext.get('testKey');
            }, defaultContext);
            
            expect(result).toBe('initialValue');
        });
    });
});