// MCP-server (stdio) som eksponerer REMA 1000-data som agentverktøy.
// Verktøybeskrivelsene er på engelsk med hensikt — de leses av språkmodellen.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { rema } from "./rema-cli.js";
import { getCampaigns } from "./rema-api.js";

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export async function runMcpServer(): Promise<void> {
  const server = new McpServer({ name: "rema-connector", version: "0.1.0" });

  server.registerTool(
    "get_auth_status",
    {
      description:
        "Check whether the user is logged in to REMA 1000. If not, ask the user to run 'rema auth login' in a terminal (opens a browser for phone authentication) — the agent cannot log in for them.",
      inputSchema: {},
    },
    async () => jsonResult(await rema(["auth", "status"])),
  );

  server.registerTool(
    "search_products",
    {
      description:
        "Search REMA 1000's product catalog. Norwegian terms work best (e.g. 'melk'). NOTE: results have NO prices (REMA does not expose catalog prices) — only GTIN/EAN, name and packing size. For REMA prices use get_campaigns (sale prices), get_offers (personal price cuts) or get_receipt (observed prices from purchases).",
      inputSchema: {
        query: z.string().describe("Search term"),
        rows: z.number().int().min(1).max(100).optional().describe("Max results, default 20"),
      },
    },
    async ({ query, rows }) =>
      jsonResult(await rema(["articles", "search", query, "--rows", String(rows ?? 20)])),
  );

  server.registerTool(
    "get_offers",
    {
      description:
        "List the user's current REMA 1000 offers, missions and price cuts (personalized via the Æ program).",
      inputSchema: {},
    },
    async () => jsonResult(await rema(["offers", "list"])),
  );

  server.registerTool(
    "get_campaigns",
    {
      description:
        "List current REMA 1000 sales campaigns with product-level sale prices and before-prices (the weekly 'Superpriser' flyer). This is REMA's main public price surface — the catalog search has no prices.",
      inputSchema: {
        type: z.string().optional().describe("Campaign type, default 'SP' (Superpriser)"),
      },
    },
    async ({ type }) => jsonResult(await getCampaigns(type)),
  );

  server.registerTool(
    "get_purchase_history",
    {
      description:
        "List the user's REMA 1000 purchases (receipt headers with store, date and total). Use get_receipt for line items.",
      inputSchema: {},
    },
    async () => jsonResult(await rema(["transactions", "list"])),
  );

  server.registerTool(
    "get_receipt",
    {
      description:
        "Get the line items of one REMA 1000 receipt: product names, EAN barcodes, quantities, prices and discounts. These are real observed prices — useful as ground truth for price comparison.",
      inputSchema: {
        transaction_id: z.string().describe("Transaction id from get_purchase_history"),
      },
    },
    async ({ transaction_id }) => jsonResult(await rema(["transactions", "get", transaction_id])),
  );

  server.registerTool(
    "get_shopping_lists",
    {
      description: "List the user's REMA 1000 shopping lists (synced with the Æ app).",
      inputSchema: {},
    },
    async () => jsonResult(await rema(["lists", "list"])),
  );

  server.registerTool(
    "get_shopping_list",
    {
      description: "Get one REMA 1000 shopping list with its items.",
      inputSchema: {
        list_id: z.string(),
      },
    },
    async ({ list_id }) => jsonResult(await rema(["lists", "get", list_id])),
  );

  server.registerTool(
    "create_shopping_list",
    {
      description: "Create a new shopping list in the user's REMA 1000 Æ app.",
      inputSchema: {
        name: z.string().min(1),
      },
    },
    async ({ name }) => jsonResult(await rema(["lists", "create", name])),
  );

  server.registerTool(
    "delete_shopping_list",
    {
      description:
        "Delete a REMA 1000 shopping list and all its items. Cannot be undone and the list may have been made by the user in the Æ app — confirm with the user first. Requires confirmation string 'DELETE LIST'.",
      inputSchema: {
        list_id: z.string(),
        confirmation: z.literal("DELETE LIST"),
      },
    },
    async ({ list_id }) => jsonResult(await rema(["lists", "delete", list_id])),
  );

  server.registerTool(
    "add_list_item",
    {
      description:
        "Add an item to a REMA 1000 shopping list. Pass gtin (from search_products) to link a catalog product; without it the item is free text.",
      inputSchema: {
        list_id: z.string(),
        name: z.string().min(1).describe("Item name shown in the list"),
        gtin: z.string().optional().describe("Product GTIN/EAN from search_products"),
        quantity: z.number().int().min(1).optional(),
      },
    },
    async ({ list_id, name, gtin, quantity }) =>
      jsonResult(
        await rema([
          "items",
          "add",
          list_id,
          name,
          ...(gtin ? ["--gtin", gtin] : []),
          ...(quantity !== undefined ? ["--quantity", String(quantity)] : []),
        ]),
      ),
  );

  server.registerTool(
    "update_list_item",
    {
      description: "Update a shopping list item: check it off (checked=true), rename, or change quantity.",
      inputSchema: {
        list_id: z.string(),
        item_id: z.string(),
        checked: z.boolean().optional().describe("true checks the item off, false unchecks"),
        name: z.string().optional(),
        quantity: z.number().int().min(1).optional(),
      },
    },
    async ({ list_id, item_id, checked, name, quantity }) =>
      jsonResult(
        await rema([
          "items",
          "update",
          list_id,
          item_id,
          // Avhuket vare = Inactive i Æ-appens datamodell.
          ...(checked !== undefined ? ["--state", checked ? "Inactive" : "Active"] : []),
          ...(name ? ["--name", name] : []),
          ...(quantity !== undefined ? ["--quantity", String(quantity)] : []),
        ]),
      ),
  );

  server.registerTool(
    "remove_list_item",
    {
      description: "Remove one item from a REMA 1000 shopping list.",
      inputSchema: {
        list_id: z.string(),
        item_id: z.string(),
      },
    },
    async ({ list_id, item_id }) => jsonResult(await rema(["items", "delete", list_id, item_id])),
  );

  server.registerTool(
    "search_stores",
    {
      description: "Search REMA 1000 physical stores by name or postal code.",
      inputSchema: {
        query: z.string().describe("Store name or postal code, e.g. '7033'"),
      },
    },
    async ({ query }) => jsonResult(await rema(["stores", "search", query])),
  );

  await server.connect(new StdioServerTransport());
}
