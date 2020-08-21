# node-bench

node.js benchmark

```js
import { Suite } from "@jchip/bench";

const suite = new Suite();

await suite
  .add("test 1", async () => {
    return Promise.resolve(1);
  })
  .add("test 2", async () => {
    return Promise.resolve(2);
  })
  .on("cycle", ({ result }) => {
    console.log(result);
  })
  .on("complete", results => {
    console.log(results);
  })
  .run();
```
