# AutoMCP

AutoMCP is a powerful tool that enables AI clients to seamlessly connect with and understand your documentation. It processes your documentation URLs and creates a dedicated MCP Server

You can view the backend code here: https://github.com/alexhamidi/automcp-backend

## 🚨 Important: Access Requirements

**API Key Required**: AutoMCP is currently in a private beta and requires an API key to use. To get access:
1. Sign up for the waitlist at [automcp.app](https://automcp.app)
2. Once approved, you'll receive your API key via email
3. Place your API key in a `.env` file as `AUTOMCP_API_KEY=your_key_here`

## 🚀 Quick Start

1. Clone this repository:
    ```bash
    git clone https://github.com/alexhamidi/AutoMCP.git
    ```
2. Enter the directory:
    ```
    cd AutoMCP
    ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file with your API key:
   ```
   AUTOMCP_API_KEY=your_key_here
   ```
4. Run the setup:
   ```bash
   python run.py
   ```
5. Follow the CLI instructions.


## 🛠️ Deployment Options

AutoMCP offers two deployment methods:

1. **Docker Container** (Recommended)
   - Requires Docker installation
   - Automatically manages dependencies
   - Runs in an isolated environment

2. **Local Python Server**
   - Runs directly on your machine
   - Requires Python 3.x
   - Manual dependency management


## 🔌 Client Setup Instructions

AutoMCP supports multiple AI clients. Here's how to connect each one:

### Cursor
1. Create/edit `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "your_server_name": {
      "url": "http://localhost:PORT/sse"
    }
  }
}
```

### Claude Desktop
1. Open Claude Desktop settings (`cmd+,`)
2. Click `Developer` then `Edit Config`
3. Paste the following into `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "your_server_name": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:PORT/sse"
      ]
    }
  }
}
```

### Windsurf

1. Edit `.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "your_server_name": {
      "id": "automcp-{name}",
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:PORT/sse"
      ]
    }
  }
}
```


## ⚠️ Disclaimers

- For AutoMCP to work properly, URLs must be to pages with clear, complete, HTTP Rest API documentation
- AutoMCP is currently in CLI beta
- Features and API may change without notice
- Report any issues to alexanderhamidi1@gmail.com

## 📊 Quota Management

The system will display your remaining URL quota after each processing request. Monitor this to ensure continued service availability. Currently, users are allowed 100 URLs max.

