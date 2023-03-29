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

export function queryParam(options: QueryParamOptions): any {
    const mergedOptions = {...new DefaultQueryParamsOptions(), ...options};
    return autowiredParam(allParamValues => {
        const queryStringParameters = mergedOptions.transform
            ? mergedOptions.transform(allParamValues[0].queryStringParameters)
            : allParamValues[0].queryStringParameters;
        const value = queryStringParameters ? queryStringParameters[options.name] : null;
        validateParam(mergedOptions.validators, options.name, value);
        return value;
    });
}
