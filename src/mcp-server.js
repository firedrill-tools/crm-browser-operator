import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import path from "node:path";
import { BrowserSession } from "./browser.js";

const option = (name) => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const portalUrl = option("--portal-url");
const captures = option("--captures");
if (!portalUrl || !captures) throw new Error("--portal-url and --captures required");
const parsed = new URL(portalUrl);
if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error("browser MCP accepts only a local HTTP loopback portal");
const allowWrites = process.argv.includes("--allow-writes");
let browser;
async function session() { if (!browser) browser = await BrowserSession.open(portalUrl, path.resolve(captures)); return browser; }
const result = (value) => ({ content: [{ type: "text", text: JSON.stringify(value) }], isError: Boolean(value.error) });
const safe = (handler) => async (args) => {
  try { return result(await handler(args)); }
  catch (error) { return result({ error: error instanceof Error ? error.message : String(error) }); }
};

const server = new McpServer({ name: "synthetic-crm-browser", version: "0.1.0" });
server.registerTool("inspect", { description: "Observe the current CRM portal page and save a real screenshot.", inputSchema: z.object({}) }, safe(async () => (await session()).observe()));
server.registerTool("click", { description: "Click an exact visible link or button on the local CRM portal. Save is blocked unless the run has --allow-writes.",
  inputSchema: z.object({ role: z.enum(["link", "button"]), name: z.string().min(1) }) }, safe(async (args) => {
  if (args.role === "button" && args.name === "Save contact" && !allowWrites) return { error: "writes_not_authorized" };
  return (await session()).execute("browser_click", args);
}));
server.registerTool("fill", { description: "Fill one CRM form field by its exact visible label.", inputSchema: z.object({ label: z.string().min(1), value: z.string() }) }, safe(async (args) => (await session()).execute("browser_fill", args)));
server.registerTool("select", { description: "Choose an exact option in a labelled CRM dropdown.", inputSchema: z.object({ label: z.string().min(1), option: z.string().min(1) }) }, safe(async (args) => (await session()).execute("browser_select", args)));
void serveStdio(() => server, { onerror: (error) => console.error(error.message) });
