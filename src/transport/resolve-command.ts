import { accessSync, constants } from "node:fs";
import { delimiter, extname, join } from "node:path";

/**
 * Windows resolves executables through PATHEXT only inside a shell, so spawning
 * `npx` with `shell: false` fails with ENOENT even though `npx.cmd` is on PATH.
 * Resolving the real file up front keeps shell quoting out of the picture
 * entirely, which matters because server arguments are user-controlled.
 */
const WINDOWS_EXTENSIONS = [".cmd", ".exe", ".bat", ".com", ""] as const;

export function resolveCommand(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (process.platform !== "win32") return command;
  if (command.includes("/") || command.includes("\\")) return command;
  if (extname(command).length > 0) return command;

  const pathValue = env["PATH"] ?? env["Path"] ?? "";
  const directories = pathValue.split(delimiter).filter((entry) => entry.length > 0);

  for (const extension of WINDOWS_EXTENSIONS) {
    for (const directory of directories) {
      const candidate = join(directory, `${command}${extension}`);
      if (isExecutable(candidate)) return candidate;
    }
  }
  return command;
}

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
