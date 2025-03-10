import { secureErrorHandler, sanitizeErrorData } from '../../src/util';

// Define a custom error type that includes the properties we need
interface CustomError extends Error {
    statusCode?: number;
    code?: string;
    errorData?: any;
}

describe('Secure Error Handling', () => {
    // Save the original environment variables
    const originalEnv = process.env;
    
    beforeEach(() => {
        // Reset environment variables before each test
        process.env = { ...originalEnv };
        delete process.env.deploymentStage;
        
        // Mock console.error to prevent test output pollution
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
        // Restore console.error
        jest.restoreAllMocks();
    });
    
    afterAll(() => {
        // Restore original environment variables
        process.env = originalEnv;
    });
    
    describe('sanitizeErrorData', () => {
        it('should remove sensitive fields from error data', () => {
            const errorData = {
                user: {
                    username: 'testuser',
                    password: 'secret123',
                    email: 'test@example.com'
                },
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                details: {
                    creditCard: '4111-1111-1111-1111',
                    address: '123 Main St'
                }
            };
            
            const sanitized = sanitizeErrorData(errorData);
            
            // Check that sensitive fields are removed
            expect(sanitized.user).not.toHaveProperty('password');
            expect(sanitized).not.toHaveProperty('token');
            expect(sanitized.details).not.toHaveProperty('creditCard');
            
            // Check that non-sensitive fields are preserved
            expect(sanitized.user.username).toBe('testuser');
            expect(sanitized.user.email).toBe('test@example.com');
            expect(sanitized.details.address).toBe('123 Main St');
        });
        
        it('should handle null and undefined inputs', () => {
            expect(sanitizeErrorData(null)).toBe(null);
            expect(sanitizeErrorData(undefined)).toBe(undefined);
        });
        
        it('should handle primitive values', () => {
            expect(sanitizeErrorData('test')).toBe('test');
            expect(sanitizeErrorData(123)).toBe(123);
            expect(sanitizeErrorData(true)).toBe(true);
        });
        
        it('should handle arrays', () => {
            const array = [
                { username: 'user1', password: 'pass1' },
                { username: 'user2', password: 'pass2' }
            ];
            
            const sanitized = sanitizeErrorData(array);
            
            expect(sanitized[0]).not.toHaveProperty('password');
            expect(sanitized[1]).not.toHaveProperty('password');
            expect(sanitized[0].username).toBe('user1');
            expect(sanitized[1].username).toBe('user2');
        });
    });
    
    describe('secureErrorHandler', () => {
        it('should return a sanitized error response', () => {
            const error = new Error('Something went wrong') as CustomError;
            error.statusCode = 500;
            error.errorData = {
                user: {
                    username: 'testuser',
                    password: 'secret123'
                }
            };
            
            const response = secureErrorHandler(error);
            
            expect(response.errorMessage).toBe('Something went wrong');
            expect(response.errorCode).toBe('INTERNAL_ERROR');
            
            // In non-production, error data should be included but sanitized
            if (response.errorData) {
                expect(response.errorData.user).not.toHaveProperty('password');
                expect(response.errorData.user.username).toBe('testuser');
            }
        });
        
        it('should use generic error messages in production for server errors', () => {
            // Set production environment
            process.env.deploymentStage = 'prod';
            
            const error = new Error('Database connection failed') as CustomError;
            error.statusCode = 500;
            
            const response = secureErrorHandler(error);
            
            expect(response.errorMessage).toBe('An unexpected error occurred');
            expect(response.errorCode).toBe('INTERNAL_ERROR');
            expect(response.errorData).toBeUndefined();
        });
        
        it('should include detailed error messages for client errors even in production', () => {
            // Set production environment
            process.env.deploymentStage = 'prod';
            
            const error = new Error('Invalid input') as CustomError;
            error.statusCode = 400;
            error.code = 'VALIDATION_ERROR';
            
            const response = secureErrorHandler(error);
            
            expect(response.errorMessage).toBe('Invalid input');
            expect(response.errorCode).toBe('VALIDATION_ERROR');
        });
        
        it('should handle errors without a message property', () => {
            const error = 'Something went wrong';
            
            const response = secureErrorHandler(error);
            
            expect(response.errorMessage).toBe('Something went wrong');
            expect(response.errorCode).toBe('INTERNAL_ERROR');
        });
    });
}); 