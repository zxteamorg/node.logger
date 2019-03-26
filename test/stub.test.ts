import * as assert from "assert";

import { loggerFactory } from "../src";

describe("Stub", function () {
	it("Should log to console", function () {
		loggerFactory.getLogger("test").info("test-info");
		loggerFactory.getLogger("test").trace("test-trace");
	});
});
