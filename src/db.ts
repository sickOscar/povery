import * as AWSXRay from 'aws-xray-sdk';
import { Knex, knex } from 'knex';
import { getEnvValue, isLocal } from './util';

function capturePostgresXray() {
	AWSXRay.capturePostgres(require('pg'));
}

function initPostgresClient(): Knex {
	const connection: any = {
		user: getEnvValue('POSTGRES_USER'),
		host: getEnvValue('POSTGRES_HOST'),
		database: getEnvValue('POSTGRES_DB'),
		password: getEnvValue('POSTGRES_PASSWORD'),
		port: parseInt(getEnvValue('POSTGRES_PORT')),
	};

	if (!isLocal()) {
		capturePostgresXray();

		connection.ssl = {
			rejectUnauthorized: true,
		};
	}

	return knex({
		client: 'pg',
		connection,
		pool: { min: 1, max: 1 },
	});
}

/**
 * Main class to access database.
 *
 * `DB.init()` and `DB.teardown()` are called by the bootloader.
 *
 * It uses knex, see https://knexjs.org/guide/
 *
 * Example usage
 *
 * ```
 * const results = await DB.client.select().from('users');
 * ```
 *
 */
export class DB {
	static client: Knex;

	static init() {
		DB.client = initPostgresClient();
	}

	static async tearDown() {
		DB.client.destroy()
			.catch(console.error)
	}
}
