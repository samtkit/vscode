import path from "path";
import Mocha from "mocha";
import { globIterate } from "glob";

async function runTestsAsync(mocha: Mocha): Promise<number> {
  return new Promise((resolve) => mocha.run(resolve));
}

export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
  });

  const testsRoot = path.resolve(__dirname, "..");

  for await (const file of globIterate("**/**.test.js", { cwd: testsRoot })) {
    mocha.addFile(path.resolve(testsRoot, file));
  }

  const failures = await runTestsAsync(mocha);
  if (failures > 0) {
    throw new Error(`${failures} tests failed.`);
  }
}
