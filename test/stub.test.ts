import * as assert from "assert";

import { logger, setLoggerProvider, Logger } from "../src";

describe("Stub", function () {
	it("Should log to console", function () {
		const testLogger = logger.getLogger("test");
		const subLogger = testLogger.getLogger("sub-logger");

		testLogger.fatal("test-fatal");
		subLogger.fatal("test-fatal");
		testLogger.warn("test-warn");
		subLogger.warn("test-warn");
		testLogger.info("test-info");
		subLogger.info("test-info");
		testLogger.debug("should not render due debug is not enabled");
		testLogger.trace("should not render due trace is not enabled");

		console.log("--------");
		// Setup root logger
		setLoggerProvider({
			getLogger(name: string): Logger {
				const log: Logger = {
					isTraceEnabled: true,
					isDebugEnabled: true,
					isInfoEnabled: true,
					isWarnEnabled: true,
					isErrorEnabled: true,
					isFatalEnabled: true,
					trace(message: string, ...args: any[]): void { console.log(name, message, ...args); },
					debug(message: string, ...args: any[]): void { console.log(name, message, ...args); },
					info(message: string, ...args: any[]): void { console.log(name, message, ...args); },
					warn(message: string, ...args: any[]): void { console.log(name, message, ...args); },
					error(message: string, ...args: any[]): void { console.log(name, message, ...args); },
					fatal(message: string, ...args: any[]): void { console.log(name, message, ...args); }
				};
				return log;
			}
		});

		testLogger.fatal("test-fatal");
		subLogger.fatal("test-fatal");
		testLogger.warn("test-warn");
		subLogger.warn("test-warn");
		testLogger.info("test-info");
		subLogger.info("test-info");
		testLogger.debug("test-debug");
		subLogger.debug("test-debug");
		testLogger.trace("test-trace");
		subLogger.trace("test-trace");

		console.log("--------");
		setLoggerProvider(null);

		testLogger.fatal("test-fatal");
		subLogger.fatal("test-fatal");
		testLogger.warn("test-warn");
		subLogger.warn("test-warn");
		testLogger.info("test-info");
		subLogger.info("test-info");
		testLogger.debug("should not render due debug is not enabled");
		testLogger.trace("should not render due trace is not enabled");
	});
});
