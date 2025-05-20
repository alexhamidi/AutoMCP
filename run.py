import requests
from docker import run_docker_container
import uuid
import os
import random
from dotenv import load_dotenv
import inquirer
import signal
import shutil
import sys
from getpass import getpass

load_dotenv()

# Configuration templates
CURSOR_CONFIG = '''Cursor (.cursor/mcp.json):
---------------------------------------------------------
{{
  "mcpServers": {{
    "{name}": {{
      "url": "http://localhost:{port}/sse"
    }}
  }}
}}
---------------------------------------------------------'''

CLAUDE_DESKTOP_CONFIG = '''Claude Desktop (claude_desktop_config.json):
---------------------------------------
{{
  "mcpServers": {{
    "{name}": {{
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:{port}/sse"
      ]
    }}
  }}
}}
---------------------------------------'''

WINDSURF_CONFIG = '''Windsurf (.codeium/windsurf/mcp_config.json):
---------------------------------------
{{
  "mcpServers": {{
    "{name}": {{
      "id": "automcp-{name}",
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:{port}/sse"
      ]
    }}
  }}
}}
---------------------------------------'''


_current_folder = None



def cleanup_folder(signum=None, frame=None, error=False):
    global _current_folder
    if _current_folder and os.path.exists(_current_folder) and (signum is not None or error):
        try:
            shutil.rmtree(_current_folder)
            print(f"\nCleaned up folder: {_current_folder}")
        except Exception as e:
            print(f"\nError cleaning up folder: {e}")
    if signum is not None:  # Only exit if called as signal handler
        sys.exit(1)

# Set up signal handlers
signal.signal(signal.SIGINT, cleanup_folder)
signal.signal(signal.SIGTERM, cleanup_folder)

def get_env_var_values(env_vars):
    env_vars_dict = {}
    for var in env_vars:
        value = os.getenv(var)
        if not value:
            printed_var = var
            if var == "BEARER_AUTH":
                printed_var = var + " (API key)"
            value = getpass(f"Enter value for {printed_var}: ").strip()
            if not value:
                raise ValueError(f"Value for {var} cannot be empty")
        env_vars_dict[var] = value
    return env_vars_dict


def create_env_file(directory, env_vars_dict):
    env_content = "\n".join([f"{key}={value}" for key, value in env_vars_dict.items()])
    full_path = os.path.join("servers", directory)
    os.makedirs(full_path, exist_ok=True)
    with open(os.path.join(full_path, ".env"), "w") as f:
        f.write(env_content)


def create_server_files(directory: str, files_data: dict):
    full_path = os.path.join("servers", directory)
    os.makedirs(full_path, exist_ok=True)

    # Write server.py
    with open(os.path.join(full_path, "server.py"), "w") as f:
        f.write(files_data["server_code"])

    # Write Dockerfile
    with open(os.path.join(full_path, "Dockerfile"), "w") as f:
        f.write(files_data["dockerfile"])

    # Write requirements.txt
    with open(os.path.join(full_path, "requirements.txt"), "w") as f:
        f.write(files_data["requirements"])


def main():
    global _current_folder
    api_key = os.getenv("AUTOMCP_API_KEY")
    if not api_key:
        print("API key not found. Please place your AutoMCP API key in the .env file in the form AUTOMCP_API_KEY=your_api_key")
        return

    print("Welcome to AutoMCP! We are currently in CLI beta, so please bear with us and report any issues to alexanderhamidi1@gmail.com")

    # Create servers directory if it doesn't exist
    os.makedirs("servers", exist_ok=True)

    urls = []
    print("\nPaste your documentation URLs below (submit with an empty line):")
    try:
        url_input = ""
        while True:
            line = input()
            if not line.strip():  # Empty line triggers submission
                break
            url_input += line + "\n"

        # Process all URLs
        for line in url_input.split('\n'):
            line = line.strip()
            if line and not line.startswith('>'):  # Skip empty lines and command prompt artifacts
                urls.append(line)

        if not urls:
            print("\nNo URLs provided.")
            return

    except KeyboardInterrupt:
        print("\nInput cancelled.")
        return

    print("\nfetching page data...")

    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    try:
        response = requests.post(
            f"https://api.automcp.app/v1/main",
            json={"urls": urls},
            headers=headers
        )
        response.raise_for_status()

        response_json = response.json()
        pages_data = response_json.get("data")
        urls_left = response_json.get("urls_left")

        if not pages_data:
            print("No endpoints found. Try again with different URLs.")
            return

        name = input("\nEnter a name for your server: ")
        _current_folder = os.path.join("servers", name)  # Store the current folder name with servers prefix
        port = random.randint(1000, 9999)

        # Generate MCP server files via API
        try:
            mcp_response = requests.post(
                f"https://api.automcp.app/v1/gen",
                json={
                    "pages_data": pages_data,
                    "name": name,
                    "port": port
                },
                headers=headers
            )
            mcp_response.raise_for_status()
            mcp_data = mcp_response.json()

            # Create server files
            create_server_files(name, mcp_data)
            env_vars = mcp_data["env_vars"]
        except requests.exceptions.RequestException as e:
            print(f"\nFailed to generate MCP server: {str(e)}")
            cleanup_folder(error=True)
            return

        print()

        choice = inquirer.prompt([inquirer.List('deployment',
                     message="How would you like to deploy the server?",
                     choices=['Docker container (requires Docker)', 'Local Python server'])])["deployment"]

        if choice == 'Docker container (requires Docker)':
            env_vars_dict = get_env_var_values(env_vars)
            if not run_docker_container(name, int(port), name, env_vars_dict):
                print("\nFailed to start Docker container")
                cleanup_folder(error=True)  # Clean up on failure
                return
        else:  # Local Python
            env_vars_dict = get_env_var_values(env_vars)
            create_env_file(name, env_vars_dict)

        client_choice = inquirer.prompt([inquirer.List('client',
                     message="Which client would you like to connect with?",
                     choices=['Cursor', 'Claude Desktop', 'Windsurf'])])["client"]

        if client_choice == 'Cursor':
            print("\n" + CURSOR_CONFIG.format(name=name, port=port))
        elif client_choice == 'Claude Desktop':
            print("\n" + CLAUDE_DESKTOP_CONFIG.format(name=name, port=port))
        else:  # Windsurf
            print("\n" + WINDSURF_CONFIG.format(name=name, port=port))

        if choice == 'Local Python server':
            print(f"\nTo run the server locally:")
            print(f"1. cd {name}")
            print("2. pip3 install -r requirements.txt")
            print("3. python3 server.py")

        if urls_left is not None:
            print(f"\nYou have {urls_left} URLs remaining in your quota.")

    except requests.exceptions.RequestException as e:
        try:
            error_json = e.response.json()
            if isinstance(error_json.get('detail'), dict):
                print(f"Error: {error_json['detail'].get('message', 'Unknown error')}")
                if 'failed_urls' in error_json['detail']:
                    print("\nFailed URLs:")
                    for url in error_json['detail']['failed_urls']:
                        print(f"- {url}")
            else:
                print(f"Error: {error_json.get('detail', str(e))}")
        except (ValueError, AttributeError):
            print(f"Error: {str(e)}")
        cleanup_folder(error=True)  # Clean up on error
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        cleanup_folder(error=True)  # Clean up on error


if __name__ == "__main__":
    main()


"""


"""
