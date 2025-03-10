import { maskSensitiveData } from '../../src/util';

describe('Sensitive Data Protection', () => {
    it('should mask password fields', () => {
        const data = {
            username: 'testuser',
            password: 'supersecret123',
            email: 'test@example.com'
        };
        
        const masked = maskSensitiveData(data);
        
        expect(masked).toContain('"password":"********"');
        expect(masked).not.toContain('supersecret123');
        expect(masked).toContain('testuser');
        expect(masked).toContain('test@example.com');
    });

    it('should mask different password field formats', () => {
        const data = JSON.stringify({
            user: {
                password: 'secret1',
                passwd: 'secret2',
                pass: 'secret3'
            }
        });
        
        const masked = maskSensitiveData(data);
        
        expect(masked).toContain('"password":"********"');
        expect(masked).toContain('"passwd":"********"');
        expect(masked).toContain('"pass":"********"');
        expect(masked).not.toContain('secret1');
        expect(masked).not.toContain('secret2');
        expect(masked).not.toContain('secret3');
    });

    it('should mask token fields', () => {
        const data = {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            idToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            headers: {
                authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
        };
        
        const masked = maskSensitiveData(data);
        
        expect(masked).toContain('"token":"********"');
        expect(masked).toContain('"accessToken":"********"');
        expect(masked).toContain('"refreshToken":"********"');
        expect(masked).toContain('"idToken":"********"');
        expect(masked).toContain('"authorization":"********"');
        expect(masked).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should mask API keys', () => {
        const data = {
            apiKey: 'abcd1234',
            api_key: 'efgh5678',
            headers: {
                'x-api-key': 'ijkl9012'
            }
        };
        
        const masked = maskSensitiveData(data);
        
        expect(masked).toContain('"apiKey":"********"');
        expect(masked).toContain('"api_key":"********"');
        expect(masked).toContain('"x-api-key":"********"');
        expect(masked).not.toContain('abcd1234');
        expect(masked).not.toContain('efgh5678');
        expect(masked).not.toContain('ijkl9012');
    });

    it('should mask secret fields', () => {
        const data = {
            secret: 'mysecret',
            secretKey: 'mySecretKey',
            secret_key: 'my_secret_key'
        };
        
        const masked = maskSensitiveData(data);
        
        expect(masked).toContain('"secret":"********"');
        expect(masked).toContain('"secretKey":"********"');
        expect(masked).toContain('"secret_key":"********"');
        expect(masked).not.toContain('mysecret');
        expect(masked).not.toContain('mySecretKey');
        expect(masked).not.toContain('my_secret_key');
    });

    it('should mask credit card numbers', () => {
        const data = {
            payment: {
                cardNumber: '4111-1111-1111-1111',
                expiryDate: '12/25',
                cvv: '123'
            },
            note: 'My card is 4111222233334444'
        };
        
        const masked = maskSensitiveData(data);
        
        expect(masked).toContain('4111-****-****-1111');
        expect(masked).not.toContain('4111-1111-1111-1111');
        expect(masked).not.toContain('4111222233334444');
        expect(masked).toContain('12/25');
        expect(masked).toContain('123'); // CVV is not masked as it's too short to identify reliably
    });

    it('should mask SSNs', () => {
        const data = {
            ssn: '123-45-6789',
            text: 'My SSN is 123-45-6789'
        };
        
        const masked = maskSensitiveData(data);
        
        expect(masked).toContain('***-**-****');
        expect(masked).not.toContain('123-45-6789');
    });

    it('should handle non-string inputs', () => {
        const data = {
            user: {
                name: 'Test User',
                password: 'secret'
            },
            numbers: [1, 2, 3]
        };
        
        const masked = maskSensitiveData(data);
        
        expect(masked).toContain('"password":"********"');
        expect(masked).not.toContain('secret');
        expect(masked).toContain('Test User');
        expect(masked).toContain('[1,2,3]');
    });

    it('should handle null and undefined inputs', () => {
        expect(maskSensitiveData(null)).toBe('');
        expect(maskSensitiveData(undefined)).toBe('');
    });

    it('should handle circular references gracefully', () => {
        const circular: any = { name: 'test' };
        circular.self = circular;
        
        const masked = maskSensitiveData(circular);
        
        expect(masked).toContain('[Error: Could not stringify data for masking]');
    });
}); 