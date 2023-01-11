import {povery} from "../src/povery";
import {acl, api, controller} from "../src/decorators";
import {PoveryError} from "../src/povery_error";

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
        expect(povery.forAwsEvent().load).toBeDefined();
    })

    it('load withAuth should return a function', () => {
        expect(povery.withAuth().load).toBeDefined();
    });

    describe('RPC', () => {

        it('loaded function should fail if no action is given', async () => {
            const fn = povery.load({});
            await expect(fn({}, {})).resolves.toStrictEqual({
                errorMessage: "No action given",
            })
        })

        it('loaded function should fail if no action is in the controller', async () => {
            const fn = povery.load({});
            await expect(fn({
                action: "test"
            }, {})).resolves.toStrictEqual({
                errorMessage: "Action not found",
            })
        })

    })

    describe('forAwsEvent', () => {

        it('loaded function should fire', async () => {
            const fn = povery.forAwsEvent().load(() => {
                return {
                    "CIAOSSA": "CIAOSSA"
                }
            });
            await expect(fn({}, {})).resolves.toStrictEqual({
                "CIAOSSA": "CIAOSSA"
            })

        })


    })

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
        })

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
                        errorMessage: 'test'
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
        })

        it('should retun a 403 error if the controller method throws an erro with error code', async () => {
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
                        errorMessage: 'test'
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
        })

        describe('withAuth', () => {

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
                const handler = povery.withAuth().load(testController)
                await expect(handler(httpEvent, {})).resolves.toStrictEqual({
                    body: JSON.stringify({
                        errorMessage: 'Unauthorized access (REST)'
                    }),
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH",
                    },
                    "isBase64Encoded": false,
                    "statusCode": 403
                })
            })

        })

    })

})