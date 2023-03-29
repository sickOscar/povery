import {autowiredParameterMetadataKey} from './autowired.decorator';

export function autowiredParam(logic: (...allParamValues: any[]) => any): any {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        let decoratedParameters: Map<number, (...params: any[]) => any> = Reflect.getOwnMetadata(autowiredParameterMetadataKey, target, propertyKey) || new Map();
        decoratedParameters.set(parameterIndex, logic);
        Reflect.defineMetadata(autowiredParameterMetadataKey, decoratedParameters, target, propertyKey);
    }
}