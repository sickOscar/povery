import { povery } from '../src/povery';
import { controller, api, pathParam } from '../src/decorators';
import { PoveryError } from '../src/povery_error';
import { APIGatewayEvent, Context } from 'aws-lambda';

describe('Path Parameter Transformation', () => {
  afterEach(() => {
    povery.clean();
  });

  it('should correctly transform path parameters', async () => {
    // Create a variable to store the code value
    let capturedCode: any = null;
    let capturedCodeType: string = '';

    @controller
    class TestController {
      @api('GET', '/test-errors/:code')
      async testErrorCodes(
        event: APIGatewayEvent,
        context: Context,
        @pathParam({
          name: 'code',
          transform: (val) => parseInt(val, 10)
        }) code: number
      ) {
        // Capture the code value and type
        capturedCode = code;
        capturedCodeType = typeof code;
        
        if (code >= 400 && code < 600) {
          throw new PoveryError(`Error with code ${code}`, code);
        }
        return {
          message: `No error, code ${code} is not an error code`
        };
      }
    }

    const handler = povery.load(TestController);

    // Test with a non-error code
    const result200 = await handler({
      httpMethod: 'GET',
      path: '/test-errors/200',
      pathParameters: {
        code: '200'
      },
      requestContext: {
        stage: ''
      }
    } as any, {} as Context);

    // Check the captured code value and type
    expect(capturedCode).toBe(200);
    expect(capturedCodeType).toBe('number');
    expect(result200.statusCode).toBe(200);
    expect(JSON.parse(result200.body).message).toBe('No error, code 200 is not an error code');

    // Reset captured values
    capturedCode = null;
    capturedCodeType = '';

    // Test with an error code
    const result404 = await handler({
      httpMethod: 'GET',
      path: '/test-errors/404',
      pathParameters: {
        code: '404'
      },
      requestContext: {
        stage: ''
      }
    } as any, {} as Context);

    // For error cases, we should get a response with the appropriate status code
    expect(result404.statusCode).toBe(404);
    const errorBody = JSON.parse(result404.body);
    expect(errorBody.errorMessage).toBe('Error with code 404');
  });
});