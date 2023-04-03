import {runNewExecutionContext} from "./povery"

export function withContext(context, fn) {
    return () => runNewExecutionContext(fn, context)
}

export function setContext(map:{[key:string]:any}) {
    return new Map(Object.entries(map));
}
