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
        const pathParameters = mergedOptions.transform
            ? mergedOptions.transform(allParamValues[0].pathParameters)
            : allParamValues[0].pathParameters;
        const value = pathParameters ? pathParameters[options.name] : null;
        validateParam(mergedOptions.validators, options.name, value);
        return value;
    });
}
