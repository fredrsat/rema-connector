#!/usr/bin/env node
// Inngang: `rema-connector mcp` starter MCP-serveren. All annen CLI-bruk
// gjøres direkte med `rema`-binæren, som har et utmerket CLI selv.
import { rema } from "./rema-cli.js";
import { runMcpServer } from "./server.js";

const HELP = `rema-connector — MCP server wrapping rema1000-cli

Usage:
  rema-connector mcp       Start the MCP server (stdio)
  rema-connector status    Show rema1000-cli auth status

Everything else: use the rema CLI directly (rema --help).
Log in with: rema auth login   (opens a browser for phone auth)
`;

async function main(): Promise<void> {
  const [cmd] = process.argv.slice(2);
  switch (cmd) {
    case "mcp":
      await runMcpServer();
      return;
    case "status":
      console.log(JSON.stringify(await rema(["auth", "status"]), null, 2));
      return;
    default:
      console.log(HELP);
      process.exitCode = cmd && cmd !== "help" ? 1 : 0;
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
