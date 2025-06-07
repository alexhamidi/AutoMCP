import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type AIProvider = 'gemini' | 'claude' | 'chatgpt';

function getApiKey(provider: AIProvider): string {

  const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  if (!apiKey) {
    throw new Error(`API key not found for provider ${provider}. Please set ${provider.toUpperCase()}_API_KEY in your environment.`);
  }

  return apiKey;
}

export async function getAIResponse(prompt: string, provider: AIProvider): Promise<string> {
  const getAIResponseMap = {
    gemini: getGeminiResponse,
    claude: getClaudeResponse,
    chatgpt: getChatGPTResponse
  };

  const apiKey = getApiKey(provider);
  const getResponse = getAIResponseMap[provider];
  if (!getResponse) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  return getResponse(prompt, apiKey);
}


export async function getGeminiResponse(prompt: string, apiKey: string): Promise<string> {
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  if (!response.text) {
    throw new Error('Empty response from model');
  }

  return response.text.trim()
    .replace(/```json\n/, '')
    .replace(/```\n?/, '');
}

export async function getClaudeResponse(prompt: string, apiKey: string): Promise<string> {
  const client = new Anthropic({
    apiKey: apiKey,
  });

  const response = await client.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }]
  });

  if (!response.content[0].text) {
    throw new Error('Empty response from model');
  }

  return response.content[0].text.trim()
    .replace(/```json\n/, '')
    .replace(/```\n?/, '');
}

export async function getChatGPTResponse(prompt: string, apiKey: string): Promise<string> {
  const client = new OpenAI({
    apiKey: apiKey,
  });

  const response = await client.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
  });

  if (!response.choices[0]?.message?.content) {
    throw new Error('Empty response from model');
  }

  return response.choices[0].message.content.trim()
    .replace(/```json\n/, '')
    .replace(/```\n?/, '');
}
