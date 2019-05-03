import * as assert from "assert";

import { loggerManager } from "../src";

describe("Stub", function () {
	it("Should log to console", function () {
		loggerManager.getLogger("test").info("test-info");
		loggerManager.getLogger("test").trace("test-trace");
	});
});
