import { povery } from "../src/povery";
import { api, controller, queryParam } from "../src/decorators";
import { Context } from "aws-lambda";

describe('Query Parameter Transformation', () => {
    afterEach(() => {
        povery.clean();
    });

    it('should correctly transform query parameters', async () => {
        @controller
        class TestController {
            @api('GET', '/test-query')
            async testQueryParams(
                event: any,
                context: Context,
                @queryParam({name: 'name'}) name: string,
                @queryParam({name: 'age', transform: (val) => parseInt(val, 10)}) age: number
            ) {
                return {
                    message: `Hello ${name}, you are ${age} years old`,
                    params: { name, age }
                };
            }
        }

        const fn = povery.load(TestController);
        
        // Create a mock API Gateway event with query parameters
        const mockEvent = {
            httpMethod: 'GET',
            path: '/test-query',
            queryStringParameters: {
                name: 'John',
                age: '30'
            },
            requestContext: {
                stage: ''
            }
        };

        const result = await fn(mockEvent, {});
        
        // Parse the response body
        const body = JSON.parse(result.body);
        
        // Verify the transformation worked correctly
        expect(body.message).toBe('Hello John, you are 30 years old');
        expect(body.params.name).toBe('John');
        expect(body.params.age).toBe(30); // Should be a number, not a string
        expect(typeof body.params.age).toBe('number');
    });

    it('should handle null or undefined query parameters', async () => {
        @controller
        class TestController {
            @api('GET', '/test-query-null')
            async testQueryParamsNull(
                event: any,
                context: Context,
                @queryParam({name: 'name'}) name: string,
                @queryParam({name: 'age', transform: (val) => parseInt(val, 10)}) age: number
            ) {
                return {
                    name,
                    age
                };
            }
        }

        const fn = povery.load(TestController);
        
        // Create a mock API Gateway event with missing query parameters
        const mockEvent = {
            httpMethod: 'GET',
            path: '/test-query-null',
            queryStringParameters: {
                name: 'John'
                // age is missing
            },
            requestContext: {
                stage: ''
            }
        };

        const result = await fn(mockEvent, {});
        
        // Parse the response body
        const body = JSON.parse(result.body);
        
        // Verify the behavior with missing parameters
        expect(body.name).toBe('John');
        expect(body.age).toBeNull();
    });
}); 