import {getLocalLambdasList} from "./utils.mjs";
import {versionFunction} from "./function.mjs";

export async function versionAllFunctions() {
    const lambdasList = getLocalLambdasList();
    for (const lambda of lambdasList) {
        await versionFunction(lambda);
    }
}