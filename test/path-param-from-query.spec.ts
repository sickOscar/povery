import { povery } from '../src/povery';
import { controller, api, pathParam } from '../src/decorators';
import { APIGatewayEvent, Context } from 'aws-lambda';

describe('Path Parameter from Query Parameters Issue', () => {
  afterEach(() => {
    povery.clean();
  });

  it('should prioritize pathParameters over query parameters when both exist', async () => {
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

    // Test 2: Path parameter with query parameter of same name - should prioritize pathParameters
    const result2 = await handler({
      httpMethod: 'GET',
      path: '/users/123',
      pathParameters: {
        id: '123'
      },
      queryStringParameters: {
        id: '456' // Different value in query param - should be ignored
      },
      requestContext: {
        stage: ''
      }
    } as any, {} as Context);

    expect(result2.statusCode).toBe(200);
    const body2 = JSON.parse(result2.body);
    
    // This should be '123' from pathParameters, not '456' from query
    expect(body2.id).toBe('123'); // Should be path param, not query param
  });

  it('should fallback to context.requestParams when pathParameters is missing', async () => {
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
        id: '456' // Should be ignored - we extract from URL path matching
      },
      requestContext: {
        stage: ''
      }
    } as any, {} as Context);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    
    // The path param should be extracted from the URL path matching, not query params
    expect(body.id).toBe('123'); // Should be from path, not query
  });

  it('should work with transformed path parameters using fallback', async () => {
    @controller
    class TestController {
      @api('GET', '/products/:id')
      async getProduct(
        event: APIGatewayEvent,
        context: Context,
        @pathParam({
          name: 'id',
          transform: (val) => parseInt(val, 10)
        }) id: number
      ) {
        return {
          message: `Product ID: ${id}`,
          id: id,
          type: typeof id
        };
      }
    }

    const handler = povery.load(TestController);

    // Test with missing pathParameters but should extract from URL and transform
    const result = await handler({
      httpMethod: 'GET',
      path: '/products/42',
      pathParameters: null, // Missing
      queryStringParameters: null,
      requestContext: {
        stage: ''
      }
    } as any, {} as Context);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    
    // Should extract '42' from URL and transform to number
    expect(body.id).toBe(42);
    expect(body.type).toBe('number');
  });

  it('should return null when parameter is not found anywhere', async () => {
    @controller
    class TestController {
      @api('GET', '/users/:userId') // Note: different param name
      async getUser(
        event: APIGatewayEvent,
        context: Context,
        @pathParam({name: 'id'}) id: string // Looking for 'id' but path has 'userId'
      ) {
        return {
          message: `User ID: ${id}`,
          id: id
        };
      }
    }

    const handler = povery.load(TestController);

    const result = await handler({
      httpMethod: 'GET',
      path: '/users/123',
      pathParameters: null,
      queryStringParameters: null,
      requestContext: {
        stage: ''
      }
    } as any, {} as Context);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    
    // Should be null since 'id' is not found (path has 'userId')
    expect(body.id).toBeNull();
  });
});