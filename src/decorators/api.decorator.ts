import 'reflect-metadata';
import {autowired} from './autowired.decorator';
import {SubMethods} from './controller.decorator';

/**
 * This function defines a decorator that can be applied to class
 * methods in order to associate them with a particular HTTP method
 * (e.g., "GET", "POST", etc.) and path.
 *
 * It uses express path-to-regexp to match the path, so it uses express routes.
 *
 *
 * @param method
 * @param path
 */
export function api(method: string, path: string | RegExp): any {
    return  (target, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
        autowired(target, propertyKey, descriptor);
        target[SubMethods] = target[SubMethods] || new Map();
        target[SubMethods].set(propertyKey, {
            ...target[SubMethods].get(propertyKey),
            path,
            method,
            propertyKey
        });
    }
}