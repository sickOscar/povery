import { safeJsonParse } from '../../src/util';

describe('JSON Parsing Security', () => {
    it('should parse valid JSON strings', () => {
        const validJson = '{"key": "value", "number": 123, "boolean": true, "array": [1, 2, 3]}';
        const result = safeJsonParse(validJson);
        expect(result).toEqual({
            key: 'value',
            number: 123,
            boolean: true,
            array: [1, 2, 3]
        });
    });

    it('should return the default value for invalid JSON strings', () => {
        const invalidJson = '{key: value}'; // Missing quotes
        const result = safeJsonParse(invalidJson, { defaultKey: 'defaultValue' });
        expect(result).toEqual({ defaultKey: 'defaultValue' });
    });

    it('should return the default value for empty strings', () => {
        const emptyString = '';
        const result = safeJsonParse(emptyString, []);
        expect(result).toEqual([]);
    });

    it('should return the default value for null-like inputs', () => {
        // @ts-ignore - Testing null handling
        const result = safeJsonParse(null, { isNull: true });
        expect(result).toEqual({ isNull: true });
    });

    it('should return the default value for undefined-like inputs', () => {
        // @ts-ignore - Testing undefined handling
        const result = safeJsonParse(undefined, 'default');
        expect(result).toEqual('default');
    });

    it('should use an empty object as the default default value', () => {
        // @ts-ignore - Testing undefined handling
        const result = safeJsonParse(undefined);
        expect(result).toEqual({});
    });

    it('should handle JSON with potentially dangerous content', () => {
        const jsonWithScript = '{"html": "<script>alert(\\"xss\\")</script>"}';
        const result = safeJsonParse(jsonWithScript);
        expect(result).toEqual({ html: '<script>alert("xss")</script>' });
        // Note: This test verifies that the JSON is parsed correctly, but doesn't sanitize the content.
        // XSS sanitization should be handled separately.
    });
}); 