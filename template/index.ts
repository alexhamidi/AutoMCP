#!/usr/bin/env node
// ================================
// IMPORTS
// ================================
import { config } from "dotenv";
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
config();


// ================================
// CONFIG
// ================================
const NAME = {{NAME}}
const VERSION = "1.0.0";
const SSE_PORT = 3001;

// ================================
// UTILITIES
// ================================
export const logWithTimestamp = ({
  level = "info",
  data,
}: {
  level?: "info" | "warning" | "error" | "debug";
  data?: any;
}) => {
  const timestamp = new Date().toISOString();

  const consoleData = [`${timestamp} [${level}]`];
  if (Array.isArray(data)) {
    consoleData.push(...data);
  } else {
    consoleData.push(data);
  }

  if (level === "error") {
    console.error(...consoleData);
  } else if (level === "warning") {
    console.warn(...consoleData);
  } else {
    console.log(...consoleData);
  }
};

// ================================
// TOOL SETUP
// ================================
{{TOOLS}}

// ================================
// SSE SERVER
// ================================
export async function createSSEServer() {
  const app = express();
  const server = new McpServer(
    {
      name: NAME,
      version: VERSION,
    },
    {
      capabilities: {
        resources: {},
      },
    }
  );

  setupServer(server);

  console.log("Setting up SSE server");

  let transport: SSEServerTransport;

  app.get("/sse", async (req: Request, res: Response) => {
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
  });

  app.post("/messages", async (req: Request, res: Response) => {
    if (!transport) {
      res.status(400).send("No transport found");
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  return app;
}


// ================================
// STDIO SERVER
// ================================
export async function createStdioServer() {
  const server = new McpServer(
    {
      name: NAME,
      version: VERSION,
    },
    {
      capabilities: {
        resources: {},
      },
    }
  );

  setupServer(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}


// ================================
// MAIN
// ================================
async function main() {
  // Check if SSE transport is requested via command line flag
  const useSSE = process.argv.includes("--sse");
  if (useSSE) {
    await createSSEServer().then((app) =>
      app.listen(SSE_PORT, () => {
        logWithTimestamp({
          data: `MCP Server running on http://localhost:${SSE_PORT}`,
        });
      })
    );
  } else {
    await createStdioServer();
  }
}

main().catch((error) => {
  logWithTimestamp({
    level: "error",
    data: ["Fatal error in main():", error],
  });
  process.exit(1);
});
