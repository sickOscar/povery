import {getLocalLambdasList} from "./utils.mjs";
import {promoteFunction} from "./function.mjs";

export async function promoteAllFunctions(stage) {
    const functions = getLocalLambdasList();
    for (const lambda of functions) {
        await promoteFunction(stage, lambda);
    }
}