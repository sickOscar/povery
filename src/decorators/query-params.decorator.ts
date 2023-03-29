import {validateSync} from 'class-validator';
import {autowiredParam} from './autowired-param.decorator';

export interface QueryParamsOptions {
    transform?: ((...allParamValues: any[]) => any) | null;
    validate?: boolean;
}

class DefaultQueryParamsOptions implements QueryParamsOptions {
    transform: ((...allParamValues: any[]) => any) | null = null;
    validate: boolean = false;
}

export function queryParams(options: QueryParamsOptions = {}): any {
    const mergedOptions = {...new DefaultQueryParamsOptions(), ...options};
    return autowiredParam(allParamValues => {
        const value = mergedOptions.transform
            ? mergedOptions.transform(allParamValues[0].queryStringParameters)
            : allParamValues[0].queryStringParameters;
        if (mergedOptions.validate) {
            const validationErrors = validateSync(value);
            if (validationErrors.length > 0) {
                throw {validationErrors};
            }
        }
        return value;
    });
}
