#!/usr/bin/env node
import { run } from "./cli/main.js";

const exitCode = await run(process.argv.slice(2), {
  cwd: process.cwd(),
  isTty: process.stdout.isTTY === true,
  write: (text) => {
    process.stdout.write(text);
  },
  writeError: (text) => {
    process.stderr.write(text);
  },
});

process.exitCode = exitCode;
