import { povery } from '../src/povery';
import { controller, api, pathParam } from '../src/decorators';
import { APIGatewayEvent, Context } from 'aws-lambda';

describe('Path Parameter from Query Parameters Issue', () => {
  afterEach(() => {
    povery.clean();
  });

  it('should demonstrate the issue with path parameters being overridden by query parameters', async () => {
    @controller
    class TestController {
      @api('GET', '/users/:id')
      async getUser(
        event: APIGatewayEvent,
        context: Context,
        @pathParam({name: 'id'}) id: string
      ) {
        return {
          message: `User ID from path: ${id}`,
          id: id
        };
      }
    }

    const handler = povery.load(TestController);

    // Test 1: Normal path parameter should work
    const result1 = await handler({
      httpMethod: 'GET',
      path: '/users/123',
      pathParameters: {
        id: '123'
      },
      queryStringParameters: null,
      requestContext: {
        stage: ''
      }
    } as any, {} as Context);

    expect(result1.statusCode).toBe(200);
    const body1 = JSON.parse(result1.body);
    expect(body1.id).toBe('123');

    // Test 2: Path parameter with query parameter of same name
    // This might show the issue where query parameter overrides path parameter
    const result2 = await handler({
      httpMethod: 'GET',
      path: '/users/123',
      pathParameters: {
        id: '123'
      },
      queryStringParameters: {
        id: '456' // Different value in query param
      },
      requestContext: {
        stage: ''
      }
    } as any, {} as Context);

    expect(result2.statusCode).toBe(200);
    const body2 = JSON.parse(result2.body);
    
    // This should be '123' from the path, not '456' from query
    console.log('Path param result:', body2.id);
    console.log('Full body2:', body2);
    expect(body2.id).toBe('123'); // Should be path param, not query param
  });

  it('should demonstrate potential issue with missing pathParameters', async () => {
    @controller
    class TestController {
      @api('GET', '/users/:id')
      async getUser(
        event: APIGatewayEvent,
        context: Context,
        @pathParam({name: 'id'}) id: string
      ) {
        return {
          message: `User ID: ${id}`,
          id: id
        };
      }
    }

    const handler = povery.load(TestController);

    // Test case where pathParameters might be null/undefined but query params exist
    const result = await handler({
      httpMethod: 'GET',
      path: '/users/123',
      pathParameters: null, // This might happen in some AWS configurations
      queryStringParameters: {
        id: '456'
      },
      requestContext: {
        stage: ''
      }
    } as any, {} as Context);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    
    // The path param should still be extracted from the URL path matching
    // But if the implementation is buggy, it might return null or take from query
    console.log('Missing pathParameters result:', body.id);
  });
});