import { GoogleGenAI } from '@google/genai';
import { ScrapedPage } from './scraper';
import { getAIResponse, AIProvider } from './ai';

export interface Tool {
  name: string;
  method: string;
  url: string;
  description: string;
  params: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    in_path?: boolean;
  }[];
  headers: {
    name: string;
    required: boolean;
    description: string;
    is_env: boolean;
  }[];
  bearer_auth: boolean;
}

const SYSTEM_PROMPT = `
Convert **ALL** of the REST API endpoints in this documentation to a JSON format, with the following structure. Follow these rules exactly:

1. Respond with nothing other than the JSON array, not comments, confirmations, or anything else.
2. Only extract and parse information about REST API HTTP endpoints. You may completely ignore any other pages or content.
3. All types must be quoted strings using the following format ONLY:
   - For basic types: "string", "integer", "number", "boolean"
   - For arrays: "string[]", "integer[]", "number[]", "boolean[]"
   - For objects: "object"
4. All boolean values must be valid JSON (true or false, not True or False)
5. For headers:
   - If the endpoint requires an authorization header (ex: 'Authorization: Bearer ...'), set "bearer_auth" to true
   - Always set "is_env" to true for required auth tokens/secrets that would likely be stored in an environment variable
6. The URL must be a full URL, not a relative URL
7. You must not return incomplete endpoints. If there is an endpoint with missing information, exclude it completely. THIS IS VERY IMPORTANT - YOU MUST BE 100% sure that you have the full endpoint data before you add it to the JSON array. If something MAY be partial or just a preview, exclude it.
8. All endpoints must be unique.
9. For parameters in the URL path (e.g. /users/{id} or /users/:id):
   - Add them to the params array like normal parameters
   - Set "in_path" to true for these parameters
   - Make sure they are marked as required: true
   - The parameter name must match exactly what's in the URL (without {} or :)
10. Each tool must have:
   - name: A unique identifier for the endpoint
   - method: The HTTP method (GET, POST, etc.)
   - url: The full URL, with path parameters in {param} format
   - description: A clear description of what the endpoint does
   - params: Array of parameters with name, type, required, description, and in_path
   - headers: Array of headers with name, required, description, and is_env
   - bearer_auth: Boolean indicating if Bearer token auth is required
11. Do not include authorization as a header, instead you should simply set bearer_auth to true and the system will automatically add the Authorization header with the Bearer token.
12. If there is a choice between bearer auth and x-api-key, always use bearer auth and ignore the x-api-key header.
`;

const BATCH_SIZE = 10;

function cleanTextFields(data: any): any {
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(cleanTextFields);
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && (key === 'name' || key === 'description')) {
        cleaned[key] = value.replace(/"/g, '').replace(/\n/g, '').replace(/\\/g, '');
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = cleanTextFields(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
  return data;
}

export async function parseDocumentation(scrapedPages: ScrapedPage[], provider: AIProvider): Promise<Tool[]> {
  const allResponses: Tool[] = [];

  for (const page of scrapedPages) {
    const results = [page.text];

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const fullPrompt = `${SYSTEM_PROMPT}\n\n${JSON.stringify(batch)}`;

      try {
        const responseText = await getAIResponse(fullPrompt, provider);

        try {
          const parsedJson = JSON.parse(responseText);
          if (Array.isArray(parsedJson)) {
            const cleanedJson = cleanTextFields(parsedJson);
            allResponses.push(...cleanedJson);
          } else {
            const cleanedJson = cleanTextFields(parsedJson);
            allResponses.push(cleanedJson);
          }
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          console.error('Response text:', responseText);
        }
      } catch (error) {
        console.error('Failed to generate content:', error);
      }
    }
  }

  return allResponses;
}
