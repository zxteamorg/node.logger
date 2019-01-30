import * as assert from "assert";

import { loggerFactory } from "../src";

describe("Stub", function () {
	it("Should be equal 42 to 42", function () {
		assert.equal(42, 42);
	});
	it("Should log to console", function () {
		loggerFactory.getLogger("test").info("test-info");
		loggerFactory.getLogger("test").trace("test-trace");
	});
});
