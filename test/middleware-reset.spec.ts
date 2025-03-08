import { povery } from "../src/povery";
import { controller } from "../src/decorators";

describe('Povery Middleware Reset', () => {
    // Test middleware that tracks setup/teardown calls
    const testMiddleware1 = {
        setup: jest.fn(async (event, context) => {
            context.middleware1Called = true;
        }),
        teardown: jest.fn(async (event, context) => {
            // Teardown logic
        })
    };

    const testMiddleware2 = {
        setup: jest.fn(async (event, context) => {
            context.middleware2Called = true;
        }),
        teardown: jest.fn(async (event, context) => {
            // Teardown logic
        })
    };

    @controller
    class TestController {
        async testAction(payload, context) {
            return { 
                success: true, 
                middleware1Called: context.middleware1Called, 
                middleware2Called: context.middleware2Called 
            };
        }
    }

    beforeEach(() => {
        // Reset mocks before each test
        testMiddleware1.setup.mockClear();
        testMiddleware1.teardown.mockClear();
        testMiddleware2.setup.mockClear();
        testMiddleware2.teardown.mockClear();
        povery.clean();
    });

    afterEach(() => {
        povery.clean();
    });

    it('should reset middlewares after each invocation in basic usage (Case 1)', async () => {
        // Case 1: Basic usage
        const handler = povery
            .use(testMiddleware1)
            .use(testMiddleware2)
            .load(TestController);
        
        // First invocation
        await handler({ action: 'testAction', payload: {} }, {});
        
        // Check middlewares are reset
        expect(povery.middlewares.length).toBe(0);
        expect(testMiddleware1.setup).toHaveBeenCalledTimes(1);
        expect(testMiddleware1.teardown).toHaveBeenCalledTimes(1);
        
        // Second invocation
        await handler({ action: 'testAction', payload: {} }, {});
        
        // Middlewares should be called again but still be reset after
        expect(povery.middlewares.length).toBe(0);
        expect(testMiddleware1.setup).toHaveBeenCalledTimes(2);
        expect(testMiddleware1.teardown).toHaveBeenCalledTimes(2);
    });

    it('should reset middlewares when wrapped with a function (Case 2)', async () => {
        // Case 2: Wrapped with a function (similar to Sentry.wrapHandler)
        const wrappedHandler = async (event, context) => {
            return povery
                .use(testMiddleware1)
                .use(testMiddleware2)
                .load(TestController)(event, context);
        };
        
        // First invocation
        await wrappedHandler({ action: 'testAction', payload: {} }, {});
        
        // Check middlewares are reset
        expect(povery.middlewares.length).toBe(0);
        expect(testMiddleware1.setup).toHaveBeenCalledTimes(1);
        
        // Second invocation
        await wrappedHandler({ action: 'testAction', payload: {} }, {});
        
        // Middlewares should be called again but still be reset after
        expect(povery.middlewares.length).toBe(0);
        expect(testMiddleware1.setup).toHaveBeenCalledTimes(2);
    });

    it('should reset middlewares with direct invocation (Case 3)', async () => {
        // Case 3: Direct invocation
        const directHandler = async (event, context) => {
            const result = await povery
                .use(testMiddleware1)
                .use(testMiddleware2)
                .load(TestController)(event, context);
            
            return result;
        };
        
        // First invocation
        await directHandler({ action: 'testAction', payload: {} }, {});
        
        // Check middlewares are reset
        expect(povery.middlewares.length).toBe(0);
        expect(testMiddleware1.setup).toHaveBeenCalledTimes(1);
        
        // Second invocation
        await directHandler({ action: 'testAction', payload: {} }, {});
        
        // Middlewares should be called again but still be reset after
        expect(povery.middlewares.length).toBe(0);
        expect(testMiddleware1.setup).toHaveBeenCalledTimes(2);
    });

    // Test for Sentry integration
    it('should properly reset middlewares when used with Sentry.wrapHandler', async () => {
        // Mock Sentry.wrapHandler
        const mockSentryWrapHandler = (handler) => {
            return async (event, context) => {
                try {
                    return await handler(event, context);
                } catch (error) {
                    // Mock Sentry error capture
                    console.error('Sentry would capture:', error);
                    throw error;
                }
            };
        };

        const sentryWrappedHandler = mockSentryWrapHandler(async (event, context) => {
            return povery
                .use(testMiddleware1)
                .use(testMiddleware2)
                .load(TestController)(event, context);
        });

        // First invocation
        await sentryWrappedHandler({ action: 'testAction', payload: {} }, {});
        
        // Check middlewares are reset
        expect(povery.middlewares.length).toBe(0);
        expect(testMiddleware1.setup).toHaveBeenCalledTimes(1);
        
        // Second invocation
        await sentryWrappedHandler({ action: 'testAction', payload: {} }, {});
        
        // Middlewares should be called again but still be reset after
        expect(povery.middlewares.length).toBe(0);
        expect(testMiddleware1.setup).toHaveBeenCalledTimes(2);
    });
}); 