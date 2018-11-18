import * as log4js from "log4js";

export interface Logger {
	isTraceEnabled(): boolean;
	isDebugEnabled(): boolean;
	isInfoEnabled(): boolean;
	isWarnEnabled(): boolean;
	isErrorEnabled(): boolean;
	isFatalEnabled(): boolean;

	trace(message: string, ...args: any[]): void;
	debug(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string, ...args: any[]): void;
	fatal(message: string, ...args: any[]): void;
}

export interface LoggerFactory {
	getLogger(category: string): Logger;
}

const LOGGER_ENGINE_KEY: symbol = Symbol.for("@zxteam/logger/main"); // create a unique, global symbol name
if (!(LOGGER_ENGINE_KEY in global)) {
	(global as any)[LOGGER_ENGINE_KEY] = null;
}

const FALLBACK_LOGGER_ENGINE_KEY: symbol = Symbol.for("@zxteam/logger/fallback"); // create a unique, global symbol name
if (!(FALLBACK_LOGGER_ENGINE_KEY in global)) {
	if (process.env.LOG4JS_CONFIG) {
		log4js.configure(process.env.LOG4JS_CONFIG);
	} else {
		// Use default log4js configuration
		log4js.configure({
			appenders: { console: { type: "console" } },
			categories: {
				default: {
					appenders: ["console"],
					level: "info"
				}
			}
		});
	}
	(global as any)[FALLBACK_LOGGER_ENGINE_KEY] = log4js;
}

class Dummy implements LoggerFactory {
	public static instance: LoggerFactory = new Dummy();

	public getLogger(category: string): Logger {
		const dummyLog: any = {};

		["trace", "debug", "info", "warn", "error", "fatal"].forEach(level => {
			dummyLog[level] = () => {/**/ };
			const capitalizeLevel = level.charAt(0).toUpperCase() + level.substr(1);
			dummyLog[`is${capitalizeLevel}Enabled`] = () => false;
		});

		return Object.freeze(dummyLog);
	}
}

function getLogger(category: string): Logger {
	let prevEngine: Logger | null = null;
	let innerLogger: Logger | null = null;

	const loggerImpl: any = {};

	function getUnderlayingLog() {
		const currentEngine = (global as any)[LOGGER_ENGINE_KEY];

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

		return (global as any)[FALLBACK_LOGGER_ENGINE_KEY].getLogger(category);
	}

	["trace", "debug", "info", "warn", "error", "fatal"].forEach(level => {
		loggerImpl[level] = (...args: Array<any>) => { getUnderlayingLog()[level](...args); };
		const capitalizeLevel = level.charAt(0).toUpperCase() + level.substr(1);
		loggerImpl[`is${capitalizeLevel}Enabled`] = () => getUnderlayingLog()[`is${capitalizeLevel}Enabled`]();
	});

	return loggerImpl;
}

export function getEngine(): LoggerFactory { return (global as any)[LOGGER_ENGINE_KEY]; }

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
	(global as any)[LOGGER_ENGINE_KEY] = newEngine;
}

export const dummyLogger: LoggerFactory = Dummy.instance;
export const loggerFactory: LoggerFactory = Object.freeze({ getLogger });
export default loggerFactory;
