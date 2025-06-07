export interface Config {
  geminiApiKey: string;
  firecrawlApiKey: string;
}

export interface Tool {
  name: string;
  description: string;
  url: string;
  method: string;
  params: Parameter[];
  headers: Header[];
  bearer_auth: boolean;
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  in_path?: boolean;
}

export interface Header {
  name: string;
  required: boolean;
  description: string;
  is_env: boolean;
}

export interface PageData {
  urls?: string[];
  content?: string;
}

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
