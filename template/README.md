# {{NAME}} MCP Server

This is a Model Context Protocol (MCP) server generated using AutoMCP.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory (already done for you):
```bash
SSE_PORT=3001
```

## Development

Run the server in development mode:
```bash
npm run dev
```

## Production

1. Build the server:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

## Server Modes

The server can run in two modes:

1. STDIO Mode (default):
   - Used when running the server directly
   - Communicates through standard input/output
   - Ideal for integration with LLM clients

2. SSE Mode:
   - Activated with the `--sse` flag
   - Runs an HTTP server with Server-Sent Events
   - Useful for development and testing
   - Access at `http://localhost:3001`

## Tools

The server exposes the following tools:
{{TOOLS_DOCS}}

## License

MIT
