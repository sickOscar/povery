require('reflect-metadata');

export const autowiredParameterMetadataKey = Symbol("autowiredParameter");

export function autowired(target: any, propertyName: string, descriptor: TypedPropertyDescriptor<any>) {
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
