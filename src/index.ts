const { name, version } = require(require("path").join(__dirname, "..", "package.json"));
const G: any = global || window || {};
const PACKAGE_GUARD: symbol = Symbol.for(name);
if (PACKAGE_GUARD in G) {
	const conflictVersion = G[PACKAGE_GUARD];
	// tslint:disable-next-line: max-line-length
	const msg = `Conflict module version. Look like two different version of package ${name} was loaded inside the process: ${conflictVersion} and ${version}.`;
	if (process !== undefined && process.env !== undefined && process.env.NODE_ALLOW_CONFLICT_MODULES === "1") {
		console.warn(msg + " This treats as warning because NODE_ALLOW_CONFLICT_MODULES is set.");
	} else {
		throw new Error(msg + " Use NODE_ALLOW_CONFLICT_MODULES=\"1\" to treats this error as warning.");
	}
} else {
	G[PACKAGE_GUARD] = version;
}

import * as zxteam from "@zxteam/contract";
import * as log4js from "log4js";

export interface LoggerManager {
	getLogger(category: string): zxteam.Logger;
}

const LOGGER_FACTORY_KEY: symbol = Symbol.for("@zxteam/logger/current"); // create a unique, global symbol name
const FALLBACK_LOGGER_FACTORY_KEY: symbol = Symbol.for("@zxteam/logger/fallback"); // create a unique, global symbol name

if (!(LOGGER_FACTORY_KEY in G)) {
	G[LOGGER_FACTORY_KEY] = null;
}

function getFallBackLoggerFactory(category: string) {
	if (!(FALLBACK_LOGGER_FACTORY_KEY in G)) {
		const logLevel: string | undefined = process && process.env && process.env.LOG_LEVEL;

		let config: string | log4js.Configuration;

		if (process && process.env && process.env.LOG4JS_CONFIG) {
			const configFile = process.env.LOG4JS_CONFIG;
			if (logLevel === undefined) {
				config = configFile;
			} else {
				const fileContent = require("fs").readFileSync(configFile, "utf-8");
				const log4jsConfig: log4js.Configuration = JSON.parse(fileContent);
				Object.keys(log4jsConfig.categories).forEach(c => log4jsConfig.categories[c].level = logLevel);
				console.error(`Note: Log Level was overriden by value from LOG_LEVEL environment variable for '${logLevel}'`);
				config = log4jsConfig;
			}
		} else {
			if (logLevel !== undefined) {
				console.error(`Note: Log Level was set by value from LOG_LEVEL environment variable for '${logLevel}'`);
			}
			// Use default log4js configuration
			config = {
				appenders: { console: { type: "console" } },
				categories: {
					default: {
						appenders: ["console"],
						level: logLevel || "info"
					}
				}
			};
		}
		G[FALLBACK_LOGGER_FACTORY_KEY] = new Log4jsManager(config);
	}

	return G[FALLBACK_LOGGER_FACTORY_KEY].getLogger(category);
}

class DummyLoggerManager implements LoggerManager {
	public getLogger(category: string): zxteam.Logger {
		const dummyLog: any = {};

		["trace", "debug", "info", "warn", "error", "fatal"].forEach(level => {
			dummyLog[level] = () => {/* just a stub */ };
			const capitalizeLevel = level.charAt(0).toUpperCase() + level.substr(1);
			Object.defineProperty(dummyLog, `is${capitalizeLevel}Enabled`, {
				get: () => false
			});
		});

		return Object.freeze(dummyLog);
	}
}
class Log4jsManager implements LoggerManager {
	private readonly _wrap: log4js.Log4js;

	public constructor(config: string | log4js.Configuration) {
		if (typeof config === "string") {
			this._wrap = log4js.configure(config);
		} else {
			this._wrap = log4js.configure(config);
		}
	}

	public getLogger(category: string): zxteam.Logger {
		const loggerWrap: any = this._wrap.getLogger(category);

		const logger: any = {};

		["trace", "debug", "info", "warn", "error", "fatal"].forEach(level => {
			logger[level] = (...args: any[]) => loggerWrap[level](...args);
			const capitalizeLevel = level.charAt(0).toUpperCase() + level.substr(1);
			Object.defineProperty(logger, `is${capitalizeLevel}Enabled`, {
				get: () => loggerWrap[`is${capitalizeLevel}Enabled`]()
			});
		});

		return logger;
	}
}

function getLogger(category: string): zxteam.Logger {
	let prevEngine: zxteam.Logger | null = null;
	let innerLogger: zxteam.Logger | null = null;

	const loggerImpl: any = {};

	function getUnderlayingLog() {
		const currentEngine = G[LOGGER_FACTORY_KEY];

		if (innerLogger !== null) {
			if (prevEngine === currentEngine) {
				return innerLogger;
			}
			innerLogger = null;
			prevEngine = null;
		}

		if (currentEngine !== null) {
			innerLogger = currentEngine.getLogger(category);
			if (innerLogger !== undefined) {
				prevEngine = currentEngine;
				return innerLogger;
			}
			innerLogger = null;
		}

		return getFallBackLoggerFactory(category);
	}

	["trace", "debug", "info", "warn", "error", "fatal"].forEach(level => {
		loggerImpl[level] = (...args: Array<any>) => { getUnderlayingLog()[level](...args); };
		const capitalizeLevel = level.charAt(0).toUpperCase() + level.substr(1);
		Object.defineProperty(loggerImpl, `is${capitalizeLevel}Enabled`, {
			get: () => getUnderlayingLog()[`is${capitalizeLevel}Enabled`]
		});
	});

	return loggerImpl;
}

export function getUnderlayingManager(): LoggerManager { return G[LOGGER_FACTORY_KEY]; }

export function setUnderlayingManager(newLoggerManager: LoggerManager) {
	if (newLoggerManager !== null) {
		if (typeof newLoggerManager !== "object") {
			throw new Error("Trying to set wrong Logger Manager. Logger Manager should be an object or null");
		}
		if (typeof newLoggerManager.getLogger !== "function") {
			throw new Error(
				"Trying to set wrong Logger Manager. Logger Manager object should contain a method getLogger(catalog)"
			);
		}
	}
	G[LOGGER_FACTORY_KEY] = newLoggerManager;
}

export const loggerManager: LoggerManager = Object.freeze({ getLogger });
export default loggerManager;
