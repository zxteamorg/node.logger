const { name: packageName, version: packageVersion } = require("../package.json");
const G: any = global || window || {};
const PACKAGE_GUARD: symbol = Symbol.for(packageName);
if (PACKAGE_GUARD in G) {
	const conflictVersion = G[PACKAGE_GUARD];
	// tslint:disable-next-line: max-line-length
	const msg = `Conflict module version. Look like two different version of package ${packageName} was loaded inside the process: ${conflictVersion} and ${packageVersion}.`;
	if (process !== undefined && process.env !== undefined && process.env.NODE_ALLOW_CONFLICT_MODULES === "1") {
		console.warn(msg + " This treats as warning because NODE_ALLOW_CONFLICT_MODULES is set.");
	} else {
		throw new Error(msg + " Use NODE_ALLOW_CONFLICT_MODULES=\"1\" to treats this error as warning.");
	}
} else {
	G[PACKAGE_GUARD] = packageVersion;
}

import * as zxteam from "@zxteam/contract";
import * as log4js from "log4js";

const ROOT_LOGGER_KEY: symbol = Symbol.for("@zxteam/logger/root"); // create a unique, global symbol name
const FALLBACK_LOGGER_KEY: symbol = Symbol.for("@zxteam/logger/fallback"); // create a unique, global symbol name

if (!(ROOT_LOGGER_KEY in G)) {
	G[ROOT_LOGGER_KEY] = null;
}
if (!(FALLBACK_LOGGER_KEY in G)) {
	G[FALLBACK_LOGGER_KEY] = null;
}

export interface Logger {
	readonly isTraceEnabled: boolean;
	readonly isDebugEnabled: boolean;
	readonly isInfoEnabled: boolean;
	readonly isWarnEnabled: boolean;
	readonly isErrorEnabled: boolean;
	readonly isFatalEnabled: boolean;

	trace(message: string, ...args: any[]): void;
	debug(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string, ...args: any[]): void;
	fatal(message: string, ...args: any[]): void;
}

export interface LoggerProvider {
	getLogger(name?: string): Logger;
}

export class Log4jsLoggerProvider implements LoggerProvider {
	private readonly _engine: log4js.Log4js;

	public constructor(config: string | log4js.Configuration) {
		if (typeof config === "string") {
			this._engine = log4js.configure(config);
		} else {
			this._engine = log4js.configure(config);
		}
	}

	public getLogger(name: string): Logger {
		const loggerInstance: log4js.Logger = this._engine.getLogger(name);
		return new Log4jsLogger(loggerInstance);
	}
}

export class Log4jsLogger implements Logger {
	private readonly _wrap: log4js.Logger;

	public constructor(wrap: log4js.Logger) { this._wrap = wrap; }

	public get isTraceEnabled(): boolean { return this._wrap.isTraceEnabled(); }
	public get isDebugEnabled(): boolean { return this._wrap.isDebugEnabled(); }
	public get isInfoEnabled(): boolean { return this._wrap.isInfoEnabled(); }
	public get isWarnEnabled(): boolean { return this._wrap.isWarnEnabled(); }
	public get isErrorEnabled(): boolean { return this._wrap.isErrorEnabled(); }
	public get isFatalEnabled(): boolean { return this._wrap.isFatalEnabled(); }

	public trace(message: string, ...args: any[]): void { this._wrap.trace(message, ...args); }
	public debug(message: string, ...args: any[]): void { this._wrap.debug(message, ...args); }
	public info(message: string, ...args: any[]): void { this._wrap.info(message, ...args); }
	public warn(message: string, ...args: any[]): void { this._wrap.warn(message, ...args); }
	public error(message: string, ...args: any[]): void { this._wrap.error(message, ...args); }
	public fatal(message: string, ...args: any[]): void { this._wrap.fatal(message, ...args); }
}

export function setLoggerProvider(loggerProvider: LoggerProvider | null) {
	if (loggerProvider !== null) {
		if (typeof loggerProvider !== "object") {
			throw new Error("Trying to set wrong Logger Provider. Logger Provider should be an object or null.");
		}
		if (typeof loggerProvider.getLogger !== "function") {
			throw new Error("Trying to set wrong Logger Provider. Logger Provider should provide getLogger() method.");
		}
	}
	G[ROOT_LOGGER_KEY] = loggerProvider;
}

/**
 * Lazy initiable Fallback Logger Provider
 */
function getFallbackLoggerProvider(): LoggerProvider {
	if (G[FALLBACK_LOGGER_KEY] === null) {
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
		G[FALLBACK_LOGGER_KEY] = new Log4jsLoggerProvider(config);
	}

	return G[FALLBACK_LOGGER_KEY];
}

function getLoggerProvider(): LoggerProvider {
	if (G[ROOT_LOGGER_KEY] === null) {
		G[ROOT_LOGGER_KEY] = getFallbackLoggerProvider();
	}
	return G[ROOT_LOGGER_KEY];
}

class LoggerFacade implements zxteam.Logger {
	private readonly _name?: string;
	private _underlay: { provider: LoggerProvider, logger: Logger } | null; //lazy

	public constructor(name?: string) {
		this._name = name;
		this._underlay = null;
	}

	public get isTraceEnabled(): boolean { return this.underlayingLogger.isTraceEnabled; }
	public get isDebugEnabled(): boolean { return this.underlayingLogger.isDebugEnabled; }
	public get isInfoEnabled(): boolean { return this.underlayingLogger.isInfoEnabled; }
	public get isWarnEnabled(): boolean { return this.underlayingLogger.isWarnEnabled; }
	public get isErrorEnabled(): boolean { return this.underlayingLogger.isErrorEnabled; }
	public get isFatalEnabled(): boolean { return this.underlayingLogger.isFatalEnabled; }

	public trace(message: string, ...args: any[]): void { this.underlayingLogger.trace(message, ...args); }
	public debug(message: string, ...args: any[]): void { this.underlayingLogger.debug(message, ...args); }
	public info(message: string, ...args: any[]): void { this.underlayingLogger.info(message, ...args); }
	public warn(message: string, ...args: any[]): void { this.underlayingLogger.warn(message, ...args); }
	public error(message: string, ...args: any[]): void { this.underlayingLogger.error(message, ...args); }
	public fatal(message: string, ...args: any[]): void { this.underlayingLogger.fatal(message, ...args); }

	public getLogger(name?: string): zxteam.Logger {
		if (name === undefined || name === "") { return this; }
		return new LoggerFacade(this._name !== undefined ? `${this._name}.${name}` : name);
	}

	private get underlayingLogger(): Logger {
		const currentLoggerProvider = getLoggerProvider();

		if (this._underlay === null) {
			this._underlay = {
				provider: currentLoggerProvider,
				logger: currentLoggerProvider.getLogger(this._name)
			};
			return this._underlay.logger;
		} else {
			if (this._underlay.provider !== currentLoggerProvider) {
				this._underlay = {
					provider: currentLoggerProvider,
					logger: currentLoggerProvider.getLogger(this._name)
				};
			}
		}

		return this._underlay.logger;
	}
}

export const logger: zxteam.Logger = new LoggerFacade();
export default logger;
