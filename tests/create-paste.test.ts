import { mock, test, expect, describe } from "bun:test";

// create request mock
const request = mock((number: number) =>
    fetch("http://localhost:8080/api/new", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: [
            `CustomURL=test-${number}`,
            `Content=${number}`,
            `EditPassword=test-${number}`,
            `ExpireOn=${new Date().toISOString()}` // this paste will expire the moment expiration dates are checked
        ].join("&"),
    })
);

// create test
describe("app-usage", () => {
    test("create-paste", async () => {
        const start = performance.now();
        const beforeMem = process.memoryUsage.rss();

        // run test
        console.log("Sending 100 create-paste requests to /v");
        for (let i = 0; i < 110; i++) await request(i);  // 110 because for some reason 10 are skipped normally???

        // collect results
        const end = performance.now();
        const afterMem = process.memoryUsage.rss();

        // expect
        expect(afterMem).toBeLessThan(2e8); // should have used less than 200MB of memory

        console.log(`Took: ${(end - start).toFixed(2)}ms`);

        console.log(`Start mem: ${(beforeMem / 1_000_000).toFixed(2)}MB`);
        console.log(`Finish mem: ${(afterMem / 1_000_000).toFixed(2)}MB`);
    });
});
