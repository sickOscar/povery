import {AsyncLocalStorage} from "async_hooks";
const asyncLocalStorage = new AsyncLocalStorage();

export class ExecutionContext {

    static getExecutionContext() {
        return asyncLocalStorage;
    }

    static set(key:string, value:any) {
        const store:any = ExecutionContext.getExecutionContext().getStore();
        store.set(key, value)
    }

    static get(key:string) {
        const store:any = ExecutionContext.getExecutionContext().getStore();
        return store.get(key);
    }

}