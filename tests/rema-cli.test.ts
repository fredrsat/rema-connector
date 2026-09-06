import { afterEach, describe, expect, it } from "vitest";
import { remaBinary } from "../src/rema-cli.js";

describe("remaBinary", () => {
  afterEach(() => {
    delete process.env.REMA_CLI_PATH;
  });

  it("respekterer REMA_CLI_PATH-miljøvariabelen", async () => {
    process.env.REMA_CLI_PATH = "/tmp/custom/rema";
    expect(await remaBinary()).toBe("/tmp/custom/rema");
  });
});
