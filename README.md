# AutoMCP - Automated MCP Server Generation

AutoMCP is a powerful CLI tool that automatically generates MCP servers from documentation. It supports scraping API documentation from URLs or direct input and generates fully functional, published servers.

## Features

- 🤖 AI-powered documentation parsing using multiple providers:
  - OpenAI
  - Google Gemini
  - Anthropic
- 📚 Multiple documentation input methods:
  - URL scraping (supports multiple URLs)
  - Direct text input
- 🔄 Automatic server generation
- 📦 NPM package publishing support
- ⚡ Server-Sent Events (SSE) support
- 🔒 Api Key Authentication

## Prerequisites

- Node.js (v14 or higher)
- NPM account (for publishing)
- API key for one of the supported AI providers:
  - OpenAI API key
  - Google Gemini API key
  - Anthropic API key

## Installation

```bash
npm install -g @automcp.app/cli
```

## Configuration

Set up your environment variables for the AI provider you want to use:

```bash
# For OpenAI
export OPENAI_API_KEY=your_api_key

# For Google Gemini
export GEMINI_API_KEY=your_api_key

# For Anthropic
export ANTHROPIC_API_KEY=your_api_key
```

## Usage

1. Run the CLI tool:
```bash
automcp
```

2. Follow the interactive prompts:
   - Select an AI provider
   - Enter a name for your server
   - Choose documentation source (URLs or direct input)
   - Provide API documentation
   - Choose whether to publish to NPM

### Running Generated Server

If you choose not to publish to NPM, you can run the server locally:

```bash
cd servers/<your-server-name>
npm install
npm run build
npm start -- --sse
```

### Client Configuration

The generated server can be accessed in clients like Cursor using one of two configurations in your `.cursor/mcp.json` file:

1. For locally running servers:
```json
"mcp": {
  "url": "http://localhost:3001/sse"
}
```

2. For NPM published servers:
```json
"mcp": {
  "command": "npx",
  "args": [
    "-y",
    "@path-to/your-package-name@latest"
  ]
}
```

### Publishing to NPM

When publishing to NPM, you can choose between:
- Your personal NPM scope (@username/package-name)
- AutoMCP scope (@automcp.app/package-name)

Make sure you're logged in to NPM before publishing:
```bash
npm login
```

## Output Structure

The generated server will have the following structure:
```
servers/<your-server-name>/
├── index.ts           # Main server file with MCP implementation
├── package.json       # Project dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── .gitignore        # Git ignore rules
├── README.md         # Server documentation
└── dist/             # Compiled JavaScript output (after build)
```

## Error Handling

- The tool validates API keys before processing
- Provides detailed error messages for failed URL scraping
- Validates server name format
- Checks NPM login status before publishing
