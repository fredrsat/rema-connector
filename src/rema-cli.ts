// Tynt lag rundt rema1000-cli (https://github.com/Alfredvc/rema1000-cli).
// Binæren eier autentiseringen (browser-login, Firebase token-refresh i
// ~/.rema1000/tokens.json) — vi bare kjører kommandoer og parser JSON.
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class RemaCliError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
  ) {
    super(`${message}: ${stderr.slice(0, 300)}`);
  }
}

let cachedBinary: string | undefined;

/** Finner rema-binæren: REMA_CLI_PATH-miljøvariabel, ~/.local/bin/rema,
 *  ellers `rema` fra PATH. MCP-servere startet av Claude Desktop arver ikke
 *  nødvendigvis shell-PATH, derfor den eksplisitte fallbacken. */
export async function remaBinary(): Promise<string> {
  if (cachedBinary) return cachedBinary;
  if (process.env.REMA_CLI_PATH) return (cachedBinary = process.env.REMA_CLI_PATH);
  const local = join(homedir(), ".local", "bin", "rema");
  try {
    await access(local);
    return (cachedBinary = local);
  } catch {
    return (cachedBinary = "rema");
  }
}

/** Kjører `rema <args> --json` og parser utdata. Ikke-JSON returneres rått. */
export async function rema(args: string[]): Promise<unknown> {
  const binary = await remaBinary();
  try {
    const { stdout } = await execFileAsync(binary, [...args, "--json"], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 60_000,
    });
    const text = stdout.trim();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    if (e.code === "ENOENT") {
      throw new RemaCliError(
        "rema1000-cli not found",
        "Install it (https://github.com/Alfredvc/rema1000-cli) or set REMA_CLI_PATH",
      );
    }
    throw new RemaCliError(`rema ${args.join(" ")} failed`, e.stderr ?? String(e));
  }
}
