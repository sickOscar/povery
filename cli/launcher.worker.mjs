import {workerData} from 'worker_threads';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import util from "util";
import {exec as execChildProcess} from "child_process";
const exec = util.promisify(execChildProcess);

const {lambda, environment} = workerData;

async function invokeTsLocally() {

	let {poveryCliPath, functionName, options}	= lambda;
	console.log(`options`, options)

    let code = fs.readFileSync(
    	path.join(poveryCliPath, '/launcher.source'),
    	'utf-8'
    );
    // put all code in one line
    code = code.replace(/\n/g, '');
    code = code.replace('$$$_FUNCTION_NAME_$$$', functionName);

    const lambdaOptionsDefault = {
    	type: 'event',
    };

    const lambdaOptions = {
    	...lambdaOptionsDefault,
    };

    const claims = {
    	"custom:customer": "development",
    	"custom:role": "admin",
    	email: "user@povery.fake",
    	sub: "00000000-3687-4dd1-a4c3-333cf5a22702"
    }

	if (options.auth) {
		const authFile = path.resolve(`./lambda/${functionName}/auth.json`);
		if (fs.existsSync(authFile)) {
			const auth = fs.readJsonSync(authFile);
			Object.assign(claims, auth);
		} else {
			console.error(chalk.red(`Auth file not found: ${authFile}. You should create auth.json file or give an JSON object`));
			return;
		}
	}


    code = code.replace('$$$_TYPE_$$$', lambdaOptions.type);

    if (options.payload) {
    	code = code.replace('$$$_EVENT_PATH_$$$', '');
    	code = code.replace('$$$_EVENT_BODY_$$$', options.payload);
    	code = code.replace(`$$$_CLAIMS_$$$`, JSON.stringify(claims));
    } else {
    	let eventPath;
    	if (options.eventFilename) {
    		eventPath = path.resolve(`./lambda/${functionName}/events/${options.eventFilename}`);
    	} else {
    		eventPath = path.resolve(`./lambda/${functionName}/event.json`);
    	}
    	// check if file at eventPath exists
    	if (!fs.existsSync(eventPath)) {
    		console.log(`No event.json file found for ${functionName}`);
    		return;
    	}
    	code = code.replace('$$$_EVENT_BODY_$$$', '""');
    	code = code.replace('$$$_EVENT_PATH_$$$', eventPath);
    	code = code.replace(`$$$_CLAIMS_$$$`, JSON.stringify(claims));
    }

    const debuggerOptions = ``;
    // const debuggerOptions = `--inspect=4321`;
    // const debuggerOptions = `--node-options="--inspect-brk"`;

    const tsNodeDev = `ts-node ${debuggerOptions} --transpileOnly -e '${code}' `;

    const invokeProcess = exec(tsNodeDev);
    invokeProcess.child.stdout.on('data', (data) => {
    	// Strip the last \n from the data
    	const output = data.toString().replace(/\n$/, '');
    	console.log(`${chalk.green(`#`)} ${output}`);
    });
    invokeProcess.child.stderr.on('data', (data) => {
    	console.log(`${chalk.red(`#`)} ${data.toString()}`);
    });
    invokeProcess.child.on('close', (code) => {
    	console.log(`${chalk.green(`#`)} Process exited with code ${code}`);
    });

    await invokeProcess;
}

await invokeTsLocally()
