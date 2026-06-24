/** Tiny leveled logger. Keeps CLI output readable and greppable in CI. */
import pc from "picocolors";

export const log = {
  info: (msg: string) => console.log(`${pc.cyan("›")} ${msg}`),
  step: (msg: string) => console.log(`${pc.magenta("◆")} ${msg}`),
  ok: (msg: string) => console.log(`${pc.green("✓")} ${msg}`),
  warn: (msg: string) => console.log(`${pc.yellow("!")} ${msg}`),
  error: (msg: string) => console.error(`${pc.red("✗")} ${msg}`),
  dim: (msg: string) => console.log(pc.dim(msg)),
};
