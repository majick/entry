import { mock, test, expect, describe } from "bun:test";

// create request mock
const request = mock(() => fetch("http://localhost:8080/v"));

// create test
describe("performance", () => {
    test("request-memory", async () => {
        const start = performance.now();
        const beforeMem = process.memoryUsage.rss();

        // run test
        console.log("Sending 10,000 requests to /v");
        for (let i = 0; i < 10000; i++) await request(); // request 10,000 times

        // collect results
        const end = performance.now();
        const afterMem = process.memoryUsage.rss();

        // expect
        expect(afterMem).toBeLessThan(1.5e8); // should have used less than 150MB of memory

        console.log(`Took: ${(end - start).toFixed(2)}ms`);

        console.log(`Start mem: ${(beforeMem / 1_000_000).toFixed(2)}MB`);
        console.log(`Finish mem: ${(afterMem / 1_000_000).toFixed(2)}MB`);
    });
});