#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const scraper_1 = require("./utils/scraper");
const parser_1 = require("./utils/parser");
const generator_1 = require("./utils/generator");
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
dotenv_1.default.config();
const program = new commander_1.Command();
async function publishToNpm(serverPath, packageName) {
    try {
        console.log('\nChecking npm login status...');
        let npmUsername;
        try {
            const { stdout } = await execAsync('npm whoami');
            npmUsername = stdout.trim();
            console.log(`Logged in as: ${npmUsername}`);
        }
        catch {
            console.log('Please log in to npm first by running:');
            console.log('npm login');
            console.log('\nAfter logging in, run this command again to publish.');
            process.exit(0);
        }
        // Update package.json with the correct name
        const packageJsonPath = path_1.default.join(serverPath, 'package.json');
        const packageJson = await fs_extra_1.default.readJson(packageJsonPath);
        packageJson.name = packageName;
        await fs_extra_1.default.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        console.log('\nBuilding package...');
        await execAsync('npm run build', { cwd: serverPath });
        console.log('\nPublishing package...');
        await execAsync('npm publish --access public', { cwd: serverPath });
        console.log('\n✨ Package published successfully!');
    }
    catch (error) {
        console.error('\nError during publishing:', error);
        throw error;
    }
}
program
    .name('automcp')
    .description('AutoMCP - Automated API Client Generation')
    .version('1.0.0')
    .action(async () => {
    try {
        // Get AI provider
        const { provider } = await inquirer_1.default.prompt([{
                type: 'list',
                name: 'provider',
                message: 'Select the AI provider to use to parse the documentation:',
                choices: ['gemini', 'openai', 'anthropic'],
                default: 'gemini'
            }]);
        // Validate API key early
        try {
            const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
            if (!apiKey) {
                throw new Error(`API key not found for provider ${provider}. Please set ${provider.toUpperCase()}_API_KEY in your environment.`);
            }
        }
        catch (error) {
            console.error('\nError:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
        // Get server name
        const { name } = await inquirer_1.default.prompt([{
                type: 'input',
                name: 'name',
                message: 'Enter a name for your server:',
                validate: (input) => {
                    if (!input.trim())
                        return 'Name is required';
                    if (!/^[a-zA-Z0-9-_]+$/.test(input))
                        return 'Name can only contain letters, numbers, hyphens, and underscores';
                    return true;
                }
            }]);
        // Get documentation source
        const { source } = await inquirer_1.default.prompt([{
                type: 'list',
                name: 'source',
                message: 'How would you like to provide the API documentation?',
                choices: ['URLs', 'Direct Input']
            }]);
        let scrapingResult;
        if (source === 'URLs') {
            const { urls } = await inquirer_1.default.prompt([{
                    type: 'input',
                    name: 'urls',
                    message: 'Enter URLs (comma-separated):',
                    validate: (input) => input.trim() ? true : 'At least one URL is required'
                }]);
            const urlList = urls.split(',').map((url) => url.trim());
            console.log('\nScraping documentation from URLs...');
            scrapingResult = await (0, scraper_1.scrapeUrls)(urlList);
            if (!scrapingResult.success) {
                throw new Error('Failed to scrape documentation: ' + JSON.stringify(scrapingResult.failed_urls));
            }
            fs_extra_1.default.writeFileSync('scrapingResult.json', JSON.stringify(scrapingResult, null, 2));
        }
        else {
            const { content } = await inquirer_1.default.prompt([{
                    type: 'editor',
                    name: 'content',
                    message: 'Enter your API documentation:',
                    validate: (input) => input.trim() ? true : 'Content is required'
                }]);
            scrapingResult = {
                success: true,
                data: [{ text: content, url: 'direct-input' }],
                failed_urls: []
            };
        }
        // Parse documentation
        console.log('\nParsing API documentation...');
        const tools = await (0, parser_1.parseDocumentation)(scrapingResult.data, provider);
        fs_extra_1.default.writeFileSync('tools.json', JSON.stringify(tools, null, 2));
        if (!tools.length) {
            throw new Error('No API endpoints found in the documentation');
        }
        console.log(`\nFound ${tools.length} endpoints`);
        // Generate server code
        console.log('\nGenerating server code...');
        const currentFolder = path_1.default.join('servers', name);
        await (0, generator_1.generateMcp)(tools, name);
        const serverPath = path_1.default.join(process.cwd(), currentFolder);
        console.log(`\nServer generated successfully in: ${serverPath}`);
        // Ask about publishing
        const { shouldPublish } = await inquirer_1.default.prompt([{
                type: 'confirm',
                name: 'shouldPublish',
                message: 'Would you like to publish this package to npm?',
                default: false
            }]);
        if (shouldPublish) {
            // Get npm username
            const { stdout: npmUsername } = await execAsync('npm whoami');
            // Ask about package scope
            const { scope } = await inquirer_1.default.prompt([{
                    type: 'list',
                    name: 'scope',
                    message: 'Which scope would you like to publish under?',
                    choices: [
                        { name: `Your personal scope (@${npmUsername.trim()})`, value: 'personal' },
                        { name: 'AutoMCP scope (@automcp.app)', value: 'automcp' }
                    ]
                }]);
            const packageName = scope === 'personal'
                ? `@${npmUsername.trim()}/${name}`
                : `@automcp.app/${name}`;
            await publishToNpm(serverPath, packageName);
        }
        else {
            console.log('\nTo run the server:');
            console.log(`cd servers/${name} && npm i && npm run build && npm start -- --sse`);
        }
    }
    catch (error) {
        console.error('\nError:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
program.parse();
