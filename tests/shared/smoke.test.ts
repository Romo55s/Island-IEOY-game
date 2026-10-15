import { describe, expect, it } from "vitest";

import { APP_NAME } from "../../src/shared/domain";

describe("foundation", () => {
  it("exports the stable application name", () => {
    expect(APP_NAME).toBe("Island of Extremely Questionable Judgment");
  });
});
