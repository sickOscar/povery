import * as fs from "fs";

export function getLocalLambdasList() {
    return fs.readdirSync('./lambda')
        .filter(entry => fs.lstatSync(`./lambda/${entry}`).isDirectory())
        .filter(directory => {
            return directory.match('^common$') === null
        })
}
