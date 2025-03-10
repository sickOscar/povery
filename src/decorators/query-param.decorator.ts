import {validateSync} from 'class-validator';
import {autowiredParam} from './autowired-param.decorator';
import {validateParam} from './validation/validation';

export interface QueryParamOptions {
    name: string;
    transform?: ((...allParamValues: any[]) => any) | null;
    validators?: PropertyDecorator[];
}

class DefaultQueryParamsOptions implements QueryParamOptions {
    name = '';
    transform: ((...allParamValues: any[]) => any) | null = null;
    validators = [];
}

/**
 * Creates a parameter decorator that extracts and processes a query parameter from an API Gateway event.
 * 
 * This decorator allows you to:
 * 1. Extract a specific query parameter by name from the request
 * 2. Optionally transform the parameter value (e.g., convert string to number)
 * 3. Apply validation to ensure the parameter meets requirements
 * 
 * @param options Configuration options for the query parameter
 * @param options.name The name of the query parameter to extract
 * @param options.transform Optional function to transform the parameter value (e.g., parseInt)
 * @param options.validators Optional array of validators to apply to the parameter
 * 
 * @returns A parameter decorator that extracts and processes the specified query parameter
 * 
 * @example
 * // Extract and convert 'age' query parameter to a number
 * @queryParam({name: 'age', transform: (val) => parseInt(val, 10)}) age: number
 */
export function queryParam(options: QueryParamOptions): any {
    const mergedOptions = {...new DefaultQueryParamsOptions(), ...options};
    return autowiredParam(allParamValues => {
        // Extract query string parameters from the event, defaulting to empty object if not present
        const queryStringParameters = allParamValues[0].queryStringParameters || {};
        // Get the specific parameter value by name, defaulting to null if not present
        let value = queryStringParameters[options.name] || null;
        
        // Apply transformation if a transform function is provided and the value exists
        if (mergedOptions.transform) {
            if (value !== null && value !== undefined) {
                value = mergedOptions.transform(value);
            }
        }
        
        // Apply validation to the parameter value
        validateParam(mergedOptions.validators, options.name, value);
        return value;
    });
}
