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
        // TODO: fix this because it's not working properly with {proxy+} path integration on local dev
        let pathParameters = allParamValues[0].pathParameters;

        // apply transform function if it exists
        if (mergedOptions.transform) {
            pathParameters = mergedOptions.transform(pathParameters);
        }

        // pathParameters is an object with key-value pairs in AWS Event
        const value = pathParameters ? pathParameters[options.name] : null;

        validateParam(mergedOptions.validators, options.name, value);
        return value;
    });
}
