import { recursiveXssSanitize } from '../../src/povery';
import xss from 'xss';

// Mock xss module
jest.mock('xss', () => {
    return jest.fn((str) => `SANITIZED_${str}`);
});

describe('XSS Protection', () => {
    beforeEach(() => {
        // Reset the mock before each test
        (xss as jest.Mock).mockClear();
    });
    
    it('should sanitize string values', () => {
        const input = 'test<script>alert("xss")</script>';
        recursiveXssSanitize(input);
        expect(xss).toHaveBeenCalledWith(input);
    });

    it('should sanitize object keys and string values', () => {
        const input = {
            'key<script>': 'value<script>',
            normalKey: 'normalValue',
            numberValue: 123
        };
        
        recursiveXssSanitize(input);
        
        expect(xss).toHaveBeenCalledWith('key<script>');
        expect(xss).toHaveBeenCalledWith('value<script>');
        expect(xss).toHaveBeenCalledWith('normalKey');
        expect(xss).toHaveBeenCalledWith('normalValue');
        expect(xss).toHaveBeenCalledWith('numberValue');
    });

    it('should sanitize nested objects', () => {
        const input = {
            level1: {
                level2: {
                    key: 'value<script>',
                    array: ['item1<script>', 'item2']
                }
            }
        };
        
        recursiveXssSanitize(input);
        
        expect(xss).toHaveBeenCalledWith('level1');
        expect(xss).toHaveBeenCalledWith('level2');
        expect(xss).toHaveBeenCalledWith('key');
        expect(xss).toHaveBeenCalledWith('value<script>');
        expect(xss).toHaveBeenCalledWith('array');
        expect(xss).toHaveBeenCalledWith('item1<script>');
        expect(xss).toHaveBeenCalledWith('item2');
    });

    it('should sanitize arrays and their contents', () => {
        const input = [
            'item1<script>',
            { key: 'value<script>' },
            ['nested1', 'nested2<script>'],
            123
        ];
        
        recursiveXssSanitize(input);
        
        expect(xss).toHaveBeenCalledWith('item1<script>');
        expect(xss).toHaveBeenCalledWith('key');
        expect(xss).toHaveBeenCalledWith('value<script>');
        expect(xss).toHaveBeenCalledWith('nested1');
        expect(xss).toHaveBeenCalledWith('nested2<script>');
    });

    it('should handle null and undefined values', () => {
        const input = {
            nullValue: null,
            undefinedValue: undefined
        };
        
        recursiveXssSanitize(input);
        
        expect(xss).toHaveBeenCalledWith('nullValue');
        expect(xss).toHaveBeenCalledWith('undefinedValue');
    });
}); 