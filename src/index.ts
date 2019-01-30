import * as log4js from "log4js";

import { LoggerLike } from "@zxteam/contract";

export interface LoggerFactory {
	getLogger(category: string): LoggerLike;
}

const G: any = global || window || {};

const LOGGER_ENGINE_KEY: symbol = Symbol.for("@zxteam/logger/main"); // create a unique, global symbol name
const FALLBACK_LOGGER_ENGINE_KEY: symbol = Symbol.for("@zxteam/logger/fallback"); // create a unique, global symbol name


if (!(LOGGER_ENGINE_KEY in G)) {
	G[LOGGER_ENGINE_KEY] = null;
}

function getFallBackLoggerEngine(category: string) {
	if (!(FALLBACK_LOGGER_ENGINE_KEY in G)) {
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
		G[FALLBACK_LOGGER_ENGINE_KEY] = new Log4jsFactory(config);
	}

	return G[FALLBACK_LOGGER_ENGINE_KEY].getLogger(category);
}

class DummyLoggerFactory implements LoggerFactory {
	public static instance: LoggerFactory = new DummyLoggerFactory();

	public getLogger(category: string): LoggerLike {
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

class Log4jsFactory implements LoggerFactory {
	private readonly _wrap: log4js.Log4js;

	public constructor(config: string | log4js.Configuration) {
		if (typeof config === "string") {
			this._wrap = log4js.configure(config);
		} else {
			this._wrap = log4js.configure(config);
		}
	}

	public getLogger(category: string): LoggerLike {
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

function getLogger(category: string): LoggerLike {
	let prevEngine: LoggerLike | null = null;
	let innerLogger: LoggerLike | null = null;

	const loggerImpl: any = {};

	function getUnderlayingLog() {
		const currentEngine = G[LOGGER_ENGINE_KEY];

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

		return getFallBackLoggerEngine(category);
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

export function getEngine(): LoggerFactory { return G[LOGGER_ENGINE_KEY]; }

export function setEngine(newEngine: LoggerFactory) {
	if (newEngine !== null) {
		if (typeof newEngine !== "object") {
			throw new Error("Trying to set wrong Engine. Logger Engine should be an object or null");
		}
		if (typeof newEngine.getLogger !== "function") {
			throw new Error(
				"Trying to set wrong Logger Engine. Logger Engine object should contain a method getLogger(catalog)"
			);
		}
	}
	G[LOGGER_ENGINE_KEY] = newEngine;
}

export const dummyLogger: LoggerFactory = DummyLoggerFactory.instance;
export const loggerFactory: LoggerFactory = Object.freeze({ getLogger });
export default loggerFactory;
