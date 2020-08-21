/* eslint-disable no-magic-numbers */

/**
 * Performance test
 */
type PerfTest = {
  /** name of test */
  name: string;
  /** function of test to call */
  func: Function;
};

/**
 * Performance result
 */
type PerfResult = {
  /** name of test */
  name: string;
  /** time in seconds the test ran */
  time: number;
  /** total number of times test executed */
  totalCount: number;
  /** calculated number of times per second */
  perSecCount: number;
};

const NS_PER_SEC = 1e9;

/**
 * convert high resolution time to seconds
 *
 * @param hr - high resolution time
 * @returns seconds
 */
function hrToSeconds(hr: number[]) {
  return hr[0] + hr[1] / NS_PER_SEC;
}

import { EventEmitter } from "events";

/**
 * node.js benchmark Suite
 *
 * Events:
 * - cycle - emits with `{ test: PerfTest, result: PerfResult }` on completion of each test
 * - complete - emits with `PerfResult[]` after all tests are done
 */
export class Suite extends EventEmitter {
  private tests: PerfTest[];
  private results: PerfResult[];

  constructor() {
    super();
    this.tests = [];
    this.results = [];
  }

  /**
   * Add a test for benchmark to the Suite
   *
   * @param name - name of test
   * @param func - function to call
   * @returns this
   */
  add(name: string, func: Function) {
    this.tests.push({ name, func });

    return this;
  }

  /**
   * Measure time takes to execute function `count` times
   *
   * @param func - function to call
   * @param isAsync - is function async (will await on it)
   * @param count - number of times to call
   * @returns time in seconds
   */
  protected async measureExecTime(
    func: Function,
    isAsync: boolean,
    count: number
  ) {
    const b = process.hrtime();

    if (isAsync) {
      for (let i = 0; i < count; i++) {
        await func();
      }
    } else {
      for (let i = 0; i < count; i++) {
        func();
      }
    }

    const e = process.hrtime(b);

    return hrToSeconds(e);
  }

  /**
   * Do a rough estimate on number of times test can run per second
   *
   * @param test - test to estimate
   * @param isAsync - async function
   * @param limitTime - how long to run estimate
   * @returns estimate result
   */
  protected async estimatePerf(
    test: PerfTest,
    isAsync: boolean,
    limitTime = 0.15
  ) {
    //
    let time = 0;
    let count = 0;
    const { func } = test;

    const b = process.hrtime();
    if (isAsync) {
      for (time = 0; time < limitTime; count++) {
        await func();
        time = hrToSeconds(process.hrtime(b));
      }
    } else {
      for (time = 0; time < limitTime; count++) {
        func();
        time = hrToSeconds(process.hrtime(b));
      }
    }

    return { time, count, estimated: Math.floor(count / time) };
  }

  /**
   * Run benchmark on a test
   *
   * @param test - test to run
   * @param isAsync - test should be async
   * @returns test benchmark result
   */
  async runTest(test: PerfTest, isAsync: boolean) {
    await this.estimatePerf(test, isAsync); // warm up v8?
    const { estimated } = await this.estimatePerf(test, isAsync, 1);

    const totalCount = Math.floor(estimated * 10.1);

    const time = await this.measureExecTime(test.func, isAsync, totalCount);

    const perSecCount = totalCount / time;

    return { name: test.name, time, totalCount, perSecCount };
  }

  /**
   * Run benchmark on all tests
   *
   * @returns results - sorted from fastest to slowest
   */
  async run() {
    let result: PerfResult;
    for (const test of this.tests) {
      const x = test.func();

      const isAsync = Boolean(x && x.then);
      if (isAsync) {
        await x;
      }

      result = await this.runTest(test, isAsync);

      this.results.push(result);
      this.emit("cycle", { test, result });
    }

    this.results = this.results.sort((a, b) => {
      return b.perSecCount - a.perSecCount;
    });

    this.emit("complete", this.results);

    return this.results;
  }
}
