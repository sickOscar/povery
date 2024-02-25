require('reflect-metadata');

export const autowiredParameterMetadataKey = Symbol("autowiredParameter");

/**
 * Runtime execution of the decorators
 *
 */
export function autowired(target: any, propertyName: string, descriptor: TypedPropertyDescriptor<any>) {
    // get the original method
    let method = descriptor.value!;

    descriptor.value = function () {
        let autowiredParameters: Map<number, (...params: any[]) => any> = Reflect.getOwnMetadata(autowiredParameterMetadataKey, target, propertyName);
        const args = new Array(arguments.length);
        Object.entries(arguments).forEach(([key, value]) => args[+key] = value);
        if (autowiredParameters) {
            [...autowiredParameters.entries()].forEach(([index, logic]) => {
                args[+index] = logic(args);
            })
        }
        return method.apply(this, args);
    };
}
