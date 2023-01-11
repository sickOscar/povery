import {MatchingRoute} from "./models";
import {match, pathToRegexp} from "path-to-regexp";

/**
 * The getRoute function is a utility function that is used to determine
 * the correct route (or endpoint) to execute given a specific HTTP method and URL path.
 *
 * The \_\_ROUTES\_\_ object is constructed by the @api decorator and is a map like this:
 *
 * ```
 * {
 *  GET: {
 *    '/users': 'getUsers',
 *    '/users/:id': 'getUser'
 *  },
 *  POST: {
 *   '/users': 'createUser'
 *  },
 *  ...
 * }
 * ```
 *
 * @param controller
 * @param httpMethod
 * @param path
 */
export function getRoute(controller, httpMethod: string, path: string): MatchingRoute {

    if (!controller.__ROUTES__) {
        throw new Error('No routes defined');
    }

    const routesMappingForThisMethod = controller.__ROUTES__[httpMethod];

    for (const route in routesMappingForThisMethod) {
        const regexp = pathToRegexp(route);
        if (regexp.test(path)) {

            const matchFn = match(route, {decode: decodeURIComponent});
            const appliedMatch = matchFn(path);

            return {
                controllerMethod: routesMappingForThisMethod[route],
                params: appliedMatch !== false ? appliedMatch.params : {},
            };
        }
    }

    throw new Error(`Route ${path} not found`);
}