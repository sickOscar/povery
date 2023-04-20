import {runNewExecutionContext} from "./povery"


function setContext(map:{[key:string]:any}) {
    return new Map(Object.entries(map));
}

export function withContext(context, fn) {
    return () => {
        runNewExecutionContext(fn, setContext(context))
    }
}

