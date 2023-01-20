import AdmZip from 'adm-zip';
import assert from 'assert';
import aws from 'aws-sdk';
import chalk from 'chalk';
import { exec as execChildProcess } from 'child_process';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import rimraf from 'rimraf';
import * as util from 'util';
const exec = util.promisify(execChildProcess);
import {Worker, workerData} from 'worker_threads';

import { getLocalLambdasList } from './utils.mjs';
import {region} from "./const.mjs";

export async function promoteFunction(stage, functionName) {
	const lambdaService = new aws.Lambda({
		region: region,
	});

	const startingAlias = stage === 'test' ? 'dev' : 'test';

	if (startingAlias === 'dev') {
		const newVersion = await versionFunction(functionName);
		await setAlias(functionName, newVersion, stage);
	} else {
		const functionInfo = await lambdaService
			.getFunction({
				FunctionName: `${functionName}:${startingAlias}`,
			})
			.promise();

		await setAlias(functionName, functionInfo.Configuration.Version, stage);
	}
}

export async function handleFunctionCommand(answers) {
	const { functionName: selectedFunction, operation, confirm, options } = answers;

	console.log('Environment:', options.environment);

	if (!selectedFunction) {
		inquirer
			.prompt([
				{
					type: 'list',
					name: 'functionName',
					message: 'Select Function:',
					choices: getLocalLambdasList(),
				},
			])
			.then(async function (answers) {
				const { functionName: lambdaName } = answers;
				await localExec(lambdaName, options);
			});
	} else {
		await localExec(selectedFunction, options);
	}

	async function localExec(functionName, options) {
		const lambdaService = new aws.Lambda({
			region: region,
		});

		// check if lambda folder exists
		const lambdaFolder = path.resolve(`./lambda/${functionName}`);
		assert(fs.existsSync(lambdaFolder), `Lambda folder ${lambdaFolder} does not exist`);

		if (!confirm) {
			console.log('Aborted');
			return;
		}

		if (operation === 'build') {
			await buildFunction(functionName);
			return;
		}

		if (operation === 'info') {
			console.log(`Info for ${functionName}`);
			getFunctionInfo(lambdaService, functionName);
			return;
		}

		if (operation === 'deploy') {
			await deployFunction(functionName, options);
			return;
		}

		// if (operation === 'version') {
		//     await versionFunction(functionName);
		//     return;
		// }

		if (operation === 'invoke') {
			await invokeFunctionLocally(functionName, options);
			return;
		}

		if (operation === 'promote') {
			inquirer
				.prompt([
					{
						type: 'list',
						name: 'stage',
						message: 'Stage to promote to',
						choices: [
							{ name: 'dev -> test', value: 'test' },
							{ name: 'staging -> prod', value: 'prod' },
						],
					},
				])
				.then(async (answers) => {
					const { stage } = answers;

					await promoteFunction(stage, functionName);
				});

			return;
		}

		if (operation === 'clean') {
			cleanDist(functionName);
		}
	}
}

export async function invokeFunctionLocally(functionName, options) {

	const poveryCliPath = path.dirname(import.meta.url).replace(`file://`, ``);

	const lambda = {
		functionName,
		poveryCliPath,
		options
	};

	const worker = new Worker(`${poveryCliPath}/launcher.worker.mjs`, {
		workerData: {
			lambda,
			env: {}
		}
	});
	worker.on('message', (message) => {
		console.log(message);
	})

	worker.on('error', (error) => {
		console.error(error);
	})

	await new Promise((resolve, reject) => {
		worker.on('exit', (code) => {
			resolve();
		});
	})


}

export async function makeBuildZip(functionName) {
	const zip = new AdmZip();

	const addingSpinner = ora(`Adding ${functionName} to zip`).start();
	zip.addLocalFolder(path.resolve(`./lambda/${functionName}/.dist/lambda/${functionName}`));
	addingSpinner.succeed(`Added ${functionName} to zip`);

	const nodeModSpinner = ora(`Adding node_modules to zip`).start();
	zip.addLocalFolder(`./lambda/${functionName}/node_modules`, 'node_modules');
	nodeModSpinner.succeed(`Added node_modules to zip`);

	const zipPath = `./lambda/${functionName}/.dist/${functionName}.zip`;
	const zippingSpinner = ora(`Writing zip to ${zipPath}`).start();
	await zip.writeZipPromise(zipPath, {});
	zippingSpinner.succeed(`Wrote zip to ${zipPath}`);

	return zipPath;
}

export function cleanDist(functionName) {
	rimraf.sync(`./lambda/${functionName}/.dist`);
	rimraf.sync(`./lambda/${functionName}/node_modules`);
}

export async function installNodeModules(functionName) {
	const spinner = ora(`Installing npm packages`).start();
	try {
		// if temporary build_folder does not exists, create it
		const tempBuildFolderPath = `./.tmp`;
		if (!fs.existsSync(tempBuildFolderPath)) {
			fs.mkdirSync(tempBuildFolderPath);
		}

		// copy povery.json to temporary build folder
		// const poveryJsonPath = `./povery.json`;
		// const tempPoveryJsonPath = `./.tmp/povery.json`;
		// fs.copyFileSync(poveryJsonPath, tempPoveryJsonPath);

		if (!fs.existsSync(`${tempBuildFolderPath}/node_modules`)) {
			// copy main package.json to temp folder
			fs.copyFileSync(`./package.json`, `${tempBuildFolderPath}/package.json`);

			// install node modules via yarn
			// const { stderr, stdout } = await exec(`yarn install --cwd ${tempBuildFolderPath} --production=true`);
			const { stderr, stdout } = await exec(`cd ${tempBuildFolderPath} && npm install --omit=dev`);
			console.error(stderr);
			console.log(stdout);
		}

		// copy node modules folder to lambda folder
		fs.copySync(`${tempBuildFolderPath}/node_modules`, `./lambda/${functionName}/node_modules`, { overwrite: true });

		// spawn a cli process to do npm install on the folder
		// const {stdout, stderr} = await exec(`cd ./lambda/${functionName} && yarn install --production=true`);
		spinner.stop();
	} catch (err) {
		spinner.stop();
		console.log(err);
	}
}

export async function checkDependencies(functionName) {
	const spinner = ora(`Checking dependencies`).start();
	try {
		const depcheckCommand = `(npx dependency-check . --missing --unused --no-dev --ignore-module request --ignore-module aws-sdk)`;
		const { stdout, stderr } = await exec(
			`cd ./lambda/${functionName}/.dist/lambda/${functionName} && ${depcheckCommand}`
		);
		spinner.succeed(`Dependencies are good`);
		console.error(stderr);
		console.log(stdout);
	} catch (err) {
		spinner.fail(`Dependencies are NOT good`);
		console.error(err);
		throw new Error(err);
	}
}

export async function compileTypescript(functionName) {
	const spinner = ora(`Compiling typescript`).start();
	try {
		const { stdout, stderr } = await exec(`cd ./lambda/${functionName} && tsc`);
		spinner.succeed(`Compiled typescript`);
		console.error(stderr);
		console.log(stdout);

		// await exec(`cp ./lambda/${functionName}/package.json ./lambda/${functionName}/.dist/lambda/${functionName}/package.json`)
	} catch (err) {
		spinner.fail(`Failed to compile typescript`);
		console.log(err);
		throw new Error(err);
	}
}

export async function buildFunction(functionName) {
	console.log(chalk.green(`Building ${functionName}`));

	cleanDist(functionName);

	await installNodeModules(functionName);
	await compileTypescript(functionName);
	// await checkDependencies(functionName);
	return await makeBuildZip(functionName);
}

export async function uploadFunctionToS3(functionName, zipPath) {
	const uploadSpinner = ora(`Uploading ${functionName} to AWS`).start();
	let uploadProgress = 0;
	const s3Key = `${functionName}/${functionName}_${+new Date()}.zip`;
	const managedUpload = new aws.S3.ManagedUpload({
		params: {
			Bucket: process.env.LAMBDA_DEPLOY_BUCKET,
			Key: s3Key,
			Body: fs.createReadStream(zipPath),
		},
	});
	managedUpload.on('httpUploadProgress', function (evt) {
		uploadProgress = evt.loaded / evt.total;
		uploadSpinner.text = `Uploading ${functionName} to AWS (${Math.round(uploadProgress * 100)}% of ${Math.round(
			evt.total / 1024 / 1024
		)}MB)`;
	});
	managedUpload.send();

	await managedUpload.promise();

	uploadSpinner.succeed(`Uploaded ${functionName} to AWS (${s3Key})`);

	return s3Key;
}

export function getFunctionInfo(lambdaService, functionName) {
	lambdaService.getFunction(
		{
			FunctionName: functionName,
		},
		(err, data) => {
			if (err) {
				console.log(err, err.stack);
			} else {
				console.log(data);
			}
		}
	);
}

export async function updateFunctionCode(functionName, s3BucketKey, environment) {
	const updateLambdaSpinner = ora(`Updating ${functionName}`).start();

	const lambdaService = new aws.Lambda({region});
	await lambdaService
		.updateFunctionCode({
			FunctionName: `${environment}_${functionName}`,
			S3Bucket: process.env.LAMBDA_DEPLOY_BUCKET,
			S3Key: s3BucketKey || `${functionName}/${functionName}.zip`,
		})
		.promise();
	updateLambdaSpinner.succeed(`Updated ${functionName}`);
}

export async function deployFunction(functionName, { environment }) {
	const zipPath = await buildFunction(functionName);
	const s3Key = await uploadFunctionToS3(functionName, zipPath);
	await updateFunctionCode(functionName, s3Key, environment);
	cleanDist(functionName);
}

export async function setAlias(lambdaName, version, aliasName) {
	const lambdaService = new aws.Lambda({
		region: region,
	});
	const aliasSpinner = ora(`Setting alias ${lambdaName}`).start();
	// point function dev alias to the newly created version
	const alias = await lambdaService
		.updateAlias({
			FunctionName: lambdaName,
			Name: aliasName,
			FunctionVersion: version,
		})
		.promise();
	aliasSpinner.succeed(`Set ${aliasName} alias ${lambdaName} to ${version}`);
}

export async function versionFunction(lambdaName) {
	const versionSpinner = ora(`Versioning ${lambdaName}`).start();
	// publish a new version of the function
	const lambdaService = new aws.Lambda({
		region: region,
	});
	const version = await lambdaService
		.publishVersion({
			FunctionName: lambdaName,
			Description: `Versioned ${new Date()}`,
		})
		.promise();
	versionSpinner.succeed(`Versioned ${lambdaName}: ${version.Version}`);
	await setAlias(lambdaName, '$LATEST', 'dev');

	return version.Version;
}
