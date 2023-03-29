import 'reflect-metadata';
import {SubMethods} from './controller.decorator';

export function acl(roles: string[]): any {
    return  (target, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
        target[SubMethods] = target[SubMethods] || new Map();
        target[SubMethods].set(propertyKey, {
            ...target[SubMethods].get(propertyKey),
            acl: roles
        });
    }
}