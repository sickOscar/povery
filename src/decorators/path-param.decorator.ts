import {validateSync} from 'class-validator';
import {autowiredParam} from './autowired-param.decorator';
import {validateParam} from './validation/validation';

export interface PathParamOptions {
    name: string;
    transform?: ((...allParamValues: any[]) => any) | null;
    validators?: PropertyDecorator[];
}

class DefaultQueryParamsOptions implements PathParamOptions {
    name = '';
    transform: ((...allParamValues: any[]) => any) | null = null;
    validators = [];
}

export function pathParam(options: PathParamOptions): any {
    const mergedOptions = {...new DefaultQueryParamsOptions(), ...options};
    return autowiredParam(allParamValues => {

        // get path parameters from AWS event
        const pathParameters = allParamValues[0].pathParameters || {};
        
        // get path parameters from route matching as fallback (context.requestParams)
        const contextParams = allParamValues[1]?.requestParams || {};

        // pathParameters is an object with key-value pairs in AWS Event
        // If not available in AWS event, fall back to the parsed parameters from route matching
        let value = pathParameters[options.name] || contextParams[options.name] || null;

        // apply transform function if it exists to the specific parameter value
        if (mergedOptions.transform && value !== null && value !== undefined) {
            value = mergedOptions.transform(value);
        }

        validateParam(mergedOptions.validators, options.name, value);
        return value;
    });
}
