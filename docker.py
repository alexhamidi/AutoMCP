import subprocess
import time
import shutil
import os

def run_docker_container(folder_id: str, port: int, name, env_vars: dict = None):
    try:
        folder_path = os.path.join("servers", folder_id)
        # Build the Docker image
        build_cmd = f"docker build -t mcp-server-{folder_id} {folder_path}"
        subprocess.run(build_cmd, shell=True, check=True)

        # Run the container with environment variables if provided
        env_vars_str = ""
        if env_vars:
            env_vars_str = " ".join(f"-e {key}={value}" for key, value in env_vars.items())

        container_name = f"mcp-{folder_id}"
        run_cmd = f"docker run -d -p {port}:{port} --name {container_name} {env_vars_str} mcp-server-{folder_id}"
        subprocess.run(run_cmd, shell=True, check=True)

        # Wait a moment for container to start
        time.sleep(2)

        # Check if container is running
        ps_cmd = f"docker ps -q -f name={container_name}"
        result = subprocess.run(ps_cmd, shell=True, capture_output=True, text=True)

        if not result.stdout.strip():
            # Container not running, get logs
            log_cmd = f"docker logs {container_name}"
            logs = subprocess.run(log_cmd, shell=True, capture_output=True, text=True)
            print(f"\nContainer failed to start. Logs:")
            print(logs.stdout)
            print(logs.stderr)

            # Cleanup failed container
            subprocess.run(f"docker rm {container_name}", shell=True)
            return False

        print(f"\nDocker container started successfully on port {port}\n")




        return True
    except subprocess.CalledProcessError as e:
        print(f"\nError running Docker container: {e}")
        # Clean up folder in case of failure
        try:
            shutil.rmtree(folder_path)
        except Exception:
            pass
        return False
