import * as assert from "assert";

import rootLogger from "../src";

describe("6.0.62", function () {
	it("Root Logger name sould be empty string", function () {
		assert.equal((rootLogger as any).name, "");
	});
});
