import {validateSync} from 'class-validator';
import {autowiredParam} from './autowired-param.decorator';
import {safeJsonParse} from '../util';

export interface BodyOptions {
    transform?: ((...allParamValues: any[]) => any) | null;
    validate?: boolean;
}

class DefaultQueryParamsOptions implements BodyOptions {
    transform: ((...allParamValues: any[]) => any) | null = null;
    validate: boolean = false;
}

function decodeBase64(data: string) {
    return Buffer.from(data, "base64").toString();
}

export function body(options: BodyOptions = {}): any {
    const mergedOptions = {...new DefaultQueryParamsOptions(), ...options};
    return autowiredParam(allParamValues => {
        const event = allParamValues[0];
        const eventBody = event.isBase64Encoded
            ? safeJsonParse(decodeBase64(event.body), {})
            : safeJsonParse(event.body, {});
        const value = mergedOptions.transform
            ? mergedOptions.transform(eventBody)
            : eventBody;
        if (mergedOptions.validate) {
            const validationErrors = validateSync(value);
            if (validationErrors.length > 0) {
                throw {validationErrors};
            }
        }
        return value;
    });
}
