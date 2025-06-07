"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const scraper_1 = require("./utils/scraper");
const parser_1 = require("./utils/parser");
const generator_1 = require("./utils/generator");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env file
dotenv.config();
// const tools = [
//     {
//       name: "getPosts",
//       description: "Get all posts or a single post by ID",
//       url: "https://jsonplaceholder.typicode.com/posts/{id}",
//       method: "GET",
//       params: [
//         {
//           name: "id",
//           type: "integer",
//           required: false,
//           description: "ID of the post to retrieve. If not provided, returns all posts"
//         }
//       ],
//       headers: [
//         {
//           name: "Content-Type",
//           required: true,
//           description: "Must be application/json",
//           is_env: false
//         }
//       ],
//       bearer_auth: false
//     },
//     {
//       name: "createPost",
//       description: "Create a new post",
//       url: "https://jsonplaceholder.typicode.com/posts",
//       method: "POST",
//       params: [
//         {
//           name: "title",
//           type: "string",
//           required: true,
//           description: "Title of the post"
//         },
//         {
//           name: "body",
//           type: "string",
//           required: true,
//           description: "Content of the post"
//         },
//         {
//           name: "userId",
//           type: "integer",
//           required: true,
//           description: "ID of the user creating the post"
//         }
//       ],
//       headers: [
//         {
//           name: "Content-Type",
//           required: true,
//           description: "Must be application/json",
//           is_env: false
//         }
//       ],
//       bearer_auth: false
//     }
//   ];
async function main() {
    try {
        // Hardcoded values for testing
        const name = 'test';
        const urls = [
            'https://resend.com/docs/api-reference/emails/update-email'
        ];
        const provider = 'gemini';
        console.log("\nScraping documentation...");
        let scrapingResult = await (0, scraper_1.scrapeUrls)(urls);
        if (!scrapingResult.success) {
            throw new Error('Failed to scrape documentation');
        }
        console.log("\nParsing documentation...");
        const tools = await (0, parser_1.parseDocumentation)(scrapingResult.data, provider);
        console.log("\nGenerating server...");
        const currentFolder = path.join('servers', name);
        await (0, generator_1.generateMcp)(tools, name);
        console.log(`\nServer generated successfully in: ${currentFolder}`);
        console.log('\nTo run the server:');
        console.log(`1. cd servers/${name}`);
        console.log('2. npm i');
        console.log('3. npm run build && npm start');
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch((error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}
