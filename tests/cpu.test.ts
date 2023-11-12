import { mock, test, expect, describe } from "bun:test";

// create request mock
const request = mock(() => fetch("http://localhost:8080/ver"));

// create test
describe("performance", () => {
    test("request-cpu", async () => {
        const start = performance.now();

        const beforeCPUSys = process.cpuUsage().system;
        const beforeCPUUsr = process.cpuUsage().user;

        // run test
        console.log("Sending 5,000 requests to /ver");
        for (let i = 0; i < 5000; i++) await request(); // request 10,000 times

        // collect results
        const end = performance.now();

        const afterCPUSys = process.cpuUsage().system;
        const afterCPUUsr = process.cpuUsage().user;

        // expect
        // expect(afterMem).toBeLessThan(2e8); // should have used less than 200MB of memory

        console.log(`Took: ${(end - start).toFixed(2)}ms`);

        console.log(`Start CPU: ${beforeCPUSys} system, ${beforeCPUUsr} user`);
        console.log(`Finish CPU:  ${afterCPUSys} system, ${afterCPUUsr} user`);

        console.log(
            `Difference: ${JSON.stringify(
                process.cpuUsage({
                    system: beforeCPUSys,
                    user: beforeCPUUsr,
                })
            )}`
        );
    });
});
