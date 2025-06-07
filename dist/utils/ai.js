"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIResponse = getAIResponse;
exports.getGeminiResponse = getGeminiResponse;
exports.getClaudeResponse = getClaudeResponse;
exports.getChatGPTResponse = getChatGPTResponse;
const genai_1 = require("@google/genai");
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
function getApiKey(provider) {
    const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    if (!apiKey) {
        throw new Error(`API key not found for provider ${provider}. Please set ${provider.toUpperCase()}_API_KEY in your environment.`);
    }
    return apiKey;
}
async function getAIResponse(prompt, provider) {
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
async function getGeminiResponse(prompt, apiKey) {
    const client = new genai_1.GoogleGenAI({ apiKey });
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
async function getClaudeResponse(prompt, apiKey) {
    const client = new sdk_1.default({
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
async function getChatGPTResponse(prompt, apiKey) {
    const client = new openai_1.default({
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
