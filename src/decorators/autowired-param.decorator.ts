import {autowiredParameterMetadataKey} from './autowired.decorator';

export function autowiredParam(logic: (...allParamValues: any[]) => any): any {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {

        // get current decorated parameters
        let decoratedParameters: Map<number, (...params: any[]) => any> = Reflect.getOwnMetadata(autowiredParameterMetadataKey, target, propertyKey) || new Map();

        // add the new parameter mapping
        decoratedParameters.set(parameterIndex, logic);

        // set the new property on target key
        Reflect.defineMetadata(autowiredParameterMetadataKey, decoratedParameters, target, propertyKey);
    }
}
