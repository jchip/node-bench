import { Suite } from "../../src";
import { expect } from "chai";

import * as xaa from "xaa";
import { describe, it } from "mocha";

describe("node-bench", () => {
  it("should run async test", async () => {
    let a = 0;
    let b = 0;
    const results = await new Suite()
      .add("test 1", async () => {
        return Promise.resolve(a++);
      })
      .add("test 2", async () => {
        return xaa.delay(100, b++);
      })
      .run();
    expect(results[0].name).to.equal("test 1");
  }).timeout(20000);

  it("should run sync tests", async () => {
    let a = 0;
    let b = 0;
    const results = await new Suite()
      .add("test 1", () => {
        return a++;
      })
      .add("test 2", () => {
        const x = Date.now();
        while (Date.now() - x < 500) {
          b++;
        }
        return b;
      })
      .run();
    expect(results[0].name).to.equal("test 1");
  }).timeout(20000);
});
