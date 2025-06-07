import { tavily } from '@tavily/core';
import { chromium } from 'playwright';
import puppeteer from 'puppeteer';

export interface ScrapedPage {
  text: string;
  url: string;
}

export interface ScrapingResult {
  success: boolean;
  data: ScrapedPage[];
  failed_urls?: { error: string; details: string }[];
  total_processed?: number;
  successful_count?: number;
  failed_count?: number;
}



async function getPagePlaywright(url: string): Promise<{ success: boolean; data?: ScrapedPage[]; error?: string; details?: string }> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url);

    // Wait for the content to load
    await page.waitForLoadState('networkidle');

    // Get all text content from the page
    const content = await page.evaluate(() => {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style');
      scripts.forEach(script => script.remove());

      // Get text from body
      return document.body.innerText;
    });

    return {
      success: true,
      data: [{
        text: content,
        url
      }]
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch URL: ${url}`,
      details: error instanceof Error ? error.message : String(error)
    };
  } finally {
    await browser.close();
  }
}


export async function scrapeUrls(urls: string[]): Promise<ScrapingResult> {
  if (!urls.length) {
    return {
      success: false,
      data: [],
      failed_urls: [{ error: 'No URLs provided', details: 'URLs array is empty' }],
      total_processed: 0,
      successful_count: 0,
      failed_count: 0
    };
  }

  const results = await Promise.all(urls.map(url => getPagePlaywright(url)));

  const successful_results: ScrapedPage[] = [];
  const failed_urls: { error: string; details: string }[] = [];

  results.forEach((result) => {
    if (result.success && result.data) {
      successful_results.push(...result.data);
    } else if (result.error && result.details) {
      failed_urls.push({ error: result.error, details: result.details });
    }
  });

  return {
    success: successful_results.length > 0,
    data: successful_results,
    failed_urls,
    total_processed: urls.length,
    successful_count: successful_results.length,
    failed_count: failed_urls.length
  };
}
