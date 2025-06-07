#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { scrapeUrls } from './utils/scraper';
import { parseDocumentation } from './utils/parser';
import { generateMcp } from './utils/generator';
import { Tool } from './lib/interfaces';
import { ScrapedPage } from './lib/interfaces';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config();

const program = new Command();

async function publishToNpm(serverPath: string, packageName: string): Promise<void> {
  try {
    console.log('\nChecking npm login status...');
    let npmUsername: string;

    try {
      const { stdout } = await execAsync('npm whoami');
      npmUsername = stdout.trim();
      console.log(`Logged in as: ${npmUsername}`);
    } catch {
      console.log('Please log in to npm first by running:');
      console.log('npm login');
      console.log('\nAfter logging in, run this command again to publish.');
      process.exit(0);
    }

    // Update package.json with the correct name
    const packageJsonPath = path.join(serverPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.name = packageName;
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

    console.log('\nBuilding package...');
    await execAsync('npm run build', { cwd: serverPath });

    console.log('\nPublishing package...');
    await execAsync('npm publish --access public', { cwd: serverPath });

    console.log('\n✨ Package published successfully!');
  } catch (error) {
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
      // Get server name
      const { name } = await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: 'Enter a name for your server:',
        validate: (input: string) => {
          if (!input.trim()) return 'Name is required';
          if (!/^[a-zA-Z0-9-_]+$/.test(input)) return 'Name can only contain letters, numbers, hyphens, and underscores';
          return true;
        }
      }]);

      // Get AI provider
      const { provider } = await inquirer.prompt([{
        type: 'list',
        name: 'provider',
        message: 'Select the AI provider to use:',
        choices: ['gemini', 'gpt-4', 'claude'],
        default: 'gemini'
      }]);

      // Get documentation source
      const { source } = await inquirer.prompt([{
        type: 'list',
        name: 'source',
        message: 'How would you like to provide the API documentation?',
        choices: ['URLs', 'Direct Input']
      }]);

      let scrapingResult;
      if (source === 'URLs') {
        const { urls } = await inquirer.prompt([{
          type: 'input',
          name: 'urls',
          message: 'Enter URLs (comma-separated):',
          validate: (input: string) => input.trim() ? true : 'At least one URL is required'
        }]);

        const urlList = urls.split(',').map((url: string) => url.trim());
        console.log('\nScraping documentation from URLs...');
        scrapingResult = await scrapeUrls(urlList);
        if (!scrapingResult.success) {
          throw new Error('Failed to scrape documentation: ' + JSON.stringify(scrapingResult.failed_urls));
        }
        fs.writeFileSync('scrapingResult.json', JSON.stringify(scrapingResult, null, 2));

      } else {
        const { content } = await inquirer.prompt([{
          type: 'editor',
          name: 'content',
          message: 'Enter your API documentation:',
          validate: (input: string) => input.trim() ? true : 'Content is required'
        }]);

        scrapingResult = {
          success: true,
          data: [{ text: content, url: 'direct-input' } as ScrapedPage],
          failed_urls: []
        };
      }

      // Parse documentation
      console.log('\nParsing API documentation...');
      const tools = await parseDocumentation(scrapingResult.data, provider);
      fs.writeFileSync('tools.json', JSON.stringify(tools, null, 2));

      if (!tools.length) {
        throw new Error('No API endpoints found in the documentation');
      }

      console.log(`\nFound ${tools.length} endpoints`);

      // Generate server code
      console.log('\nGenerating server code...');
      const currentFolder = path.join('servers', name);
      await generateMcp(tools, name);

      const serverPath = path.join(process.cwd(), currentFolder);
      console.log(`\nServer generated successfully in: ${serverPath}`);

      // Ask about publishing
      const { shouldPublish } = await inquirer.prompt([{
        type: 'confirm',
        name: 'shouldPublish',
        message: 'Would you like to publish this package to npm?',
        default: false
      }]);

      if (shouldPublish) {
        // Get npm username
        const { stdout: npmUsername } = await execAsync('npm whoami');

        // Ask about package scope
        const { scope } = await inquirer.prompt([{
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
      } else {
        console.log('\nTo run the server:');
        console.log(`cd servers/${name} && npm i && npm run build && npm start -- --sse`);
      }

    } catch (error) {
      console.error('\nError:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
