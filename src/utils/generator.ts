import * as fs from 'fs-extra';
import * as path from 'path';
import { Tool, Parameter, Header } from '../lib/interfaces';

export async function generateMcp(tools: Tool[], name: string): Promise<void> {
  const templateDir = path.join(process.cwd(), 'template');
  const targetDir = path.join(process.cwd(), 'servers', name);

  // Ensure template directory exists
  if (!fs.existsSync(templateDir)) {
    throw new Error('Template directory not found');
  }

  // Create servers directory if it doesn't exist
  await fs.ensureDir(path.join(process.cwd(), 'servers'));

  // Copy template directory to target directory
  await fs.copy(templateDir, targetDir);

  // Get all files in the target directory recursively
  const files = await fs.readdir(targetDir, { recursive: true });

  // Process each file
  for (const file of files) {
    const filePath = path.join(targetDir, file.toString());

    // Skip if it's a directory
    if (fs.statSync(filePath).isDirectory()) {
      continue;
    }

    // Read file content
    let content = await fs.readFile(filePath, 'utf8');

    // Replace placeholders differently based on file type
    if (file.toString().endsWith('package.json')) {
      content = content.replace(/{{NAME}}/g, name);
    } else if (file.toString().endsWith('index.ts')) {
      content = content.replace(/{{NAME}}/g, JSON.stringify(name));
      content = content.replace(/{{TOOLS}}/g, generateToolsSetup(tools, name));
    } else {
      // For other files (like README), just use the JSON representation
      content = content.replace(/{{NAME}}/g, name);
      content = content.replace(/{{TOOLS}}/g, JSON.stringify(tools, null, 2));
    }

    // Write back to file
    await fs.writeFile(filePath, content, 'utf8');
  }
}

function generateToolsSetup(tools: Tool[], name: string): string {
  const toolCalls = tools.map(tool => {
    const schema = getSchemaStr(tool);
    const functionStr = getFunctionStr(tool, name);

    return `  server.tool(
    "${tool.name}",
    "${tool.description}",
    {
${schema}
    },
${functionStr}
  )`;
  });

  return `function setupServer(server: McpServer) {
${toolCalls.join('\n')}
}`;
}

function getSchemaStr(tool: Tool): string {
  const schemaParts: string[] = [];

  for (const param of tool.params) {
    const typeMap: { [key: string]: string } = {
      'string': 'z.string()',
      'integer': 'z.number().int()',
      'number': 'z.number()',
      'boolean': 'z.boolean()',
      'object': 'z.record(z.string(), z.any())'
    };

    let zodType = typeMap[param.type] || 'z.any()';

    if (param.type.endsWith('[]')) {
      const baseType = param.type.slice(0, -2);
      zodType = `z.array(${typeMap[baseType] || 'z.any()'})`;
    }

    if (param.description) {
      zodType += `.describe("${param.description}")`;
    }

    if (!param.required) {
      zodType += '.optional()';
    }

    // Use underscore-based parameter names in schema
    const paramName = param.name.replace(/\./g, '_');
    schemaParts.push(`      ${paramName}: ${zodType}`);
  }

  return schemaParts.join(',\n');
}

function getFunctionStr(tool: Tool, name: string): string {
  // Create safe parameter names by replacing dots with underscores
  const paramMappings = tool.params.map(p => ({
    original: p.name,
    safe: p.name.replace(/\./g, '_')
  }));

  const paramTypes = paramMappings.map(p => `${p.safe}: any`).join(', ');
  const destructure = paramMappings.map(p => p.safe).join(', ');

  const headers = [
    '          "Content-Type": "application/json"'
  ];

  if (tool.bearer_auth) {
    headers.push(`          "Authorization": \`Bearer \${process.env.${name.replace(/-/g, '_').toUpperCase()}_API_KEY}\``);
  }

  for (const header of tool.headers) {
    if (header.is_env) {
      headers.push(`          "${header.name}": process.env.${header.name.toUpperCase()}`);
    } else if (header.name.toLowerCase() !== 'content-type') {
      headers.push(`          "${header.name}": "${header.name}"`);
    }
  }

  const headersStr = headers.join(',\n');

  // Handle URL template parameters
  let url = tool.url;
  const pathParams = tool.params.filter(p => p.in_path);
  const queryParams = tool.params.filter(p => !p.in_path);

  // Replace URL template parameters
  if (pathParams.length > 0) {
    url = '`' + url.replace(/{([^}]+)}/g, (match, param) => {
      return '${' + param + '}';
    }) + '`';
  } else {
    url = `"${url}"`;
  }

  // Add query parameters for remaining params in GET requests
  let queryParamsStr = '';
  if (tool.method.toUpperCase() === 'GET' && queryParams.length > 0) {
    queryParamsStr = `
      const params: Record<string, string> = {};
      ${queryParams.map((p: Parameter) => {
        const safeName = p.name.replace(/\./g, '_');
        if (p.type?.endsWith('[]')) {
          return `if (${safeName} !== undefined) params["${p.name}"] = ${safeName}.join(',');`;
        } else {
          return `if (${safeName} !== undefined) params["${p.name}"] = ${safeName}.toString();`;
        }
      }).join('\n      ')}
      `;
    url = `${url} + "?" + new URLSearchParams(params).toString()`;
  }

  const bodyStr = tool.method.toUpperCase() !== 'GET' && queryParams.length > 0
    ? `,\n        body: JSON.stringify({ ${queryParams.map(p => p.name.replace(/\./g, '_')).join(', ')} })`
    : '';

  return `    async (args, extra) => {
      const { ${destructure} } = args;${queryParamsStr}
      const response = await fetch(${url}, {
        method: "${tool.method}",
        headers: {
${headersStr}
        }${bodyStr}
      });

      const responseData = await response.json();
      if (responseData.error) {
        throw new Error(\`Failed to ${tool.name}: \${JSON.stringify(responseData.error)}\`);
      }
      return {
        content: [{
          type: "text" as const,
          text: \`\${JSON.stringify({data: responseData, message: "Success"}, null, 2)}\`
        }]
      };
    }`;
}

export function generateTools(tools: Tool[], name: string): string {
  const toolCalls = tools.map(tool => {
    const schema = getSchemaStr(tool);
    return `  server.tool(
    "${tool.name}",
    "${tool.description}",
    {
      ${schema}
    },
    ${getFunctionStr(tool, name)}
  )`;
  });

  return `function setupServer(server: McpServer) {
${toolCalls.join(',\n\n')}
}`;
}
