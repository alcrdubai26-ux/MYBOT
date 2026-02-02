import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_DOMAINS = [
  'gamma.app',
  'canva.com',
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com',
  'drive.google.com',
  'notion.so',
  'notion.com',
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'wikipedia.org',
];

const BLOCKED_DOMAINS = [
  'paypal.com',
  'stripe.com',
  'binance.com',
  'coinbase.com',
  'kraken.com',
  'bitwarden.com',
  '1password.com',
  'lastpass.com',
  'dashlane.com',
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'citi.com',
  'hsbc.com',
  'bbva.com',
  'santander.com',
  'ing.com',
  'revolut.com',
  'wise.com',
];

function isDomainAllowed(url: string): { allowed: boolean; reason?: string } {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    for (const blocked of BLOCKED_DOMAINS) {
      if (domain === blocked || domain.endsWith('.' + blocked)) {
        return { allowed: false, reason: `Dominio bloqueado por seguridad: ${blocked}` };
      }
    }
    
    for (const allowed of ALLOWED_DOMAINS) {
      if (domain === allowed || domain.endsWith('.' + allowed)) {
        return { allowed: true };
      }
    }
    
    return { allowed: false, reason: `Dominio no autorizado: ${domain}. Solo se permiten dominios de la lista blanca.` };
  } catch {
    return { allowed: false, reason: 'URL inválida' };
  }
}

class BrowserService {
  private browser: Browser | null = null;
  private pages: Map<string, Page> = new Map();

  async initialize(): Promise<void> {
    if (this.browser) return;
    
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('[Browser] Playwright inicializado');
    } catch (err) {
      console.error('[Browser] Error inicializando:', err);
    }
  }

  async navigate(url: string, sessionId: string = 'default'): Promise<{ success: boolean; error?: string; title?: string }> {
    const check = isDomainAllowed(url);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    await this.initialize();
    if (!this.browser) {
      return { success: false, error: 'Navegador no disponible' };
    }

    try {
      let page = this.pages.get(sessionId);
      if (!page) {
        page = await this.browser.newPage();
        this.pages.set(sessionId, page);
      }

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const title = await page.title();
      
      console.log(`[Browser] Navegando a: ${url}`);
      return { success: true, title };
    } catch (err) {
      console.error('[Browser] Error navegando:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  private async validateCurrentDomain(page: Page): Promise<{ allowed: boolean; error?: string }> {
    const currentUrl = page.url();
    const check = isDomainAllowed(currentUrl);
    if (!check.allowed) {
      return { allowed: false, error: `La página actual está en un dominio no autorizado: ${check.reason}` };
    }
    return { allowed: true };
  }

  async screenshot(sessionId: string = 'default'): Promise<{ success: boolean; imagePath?: string; error?: string }> {
    const page = this.pages.get(sessionId);
    if (!page) {
      return { success: false, error: 'No hay página activa' };
    }

    const domainCheck = await this.validateCurrentDomain(page);
    if (!domainCheck.allowed) {
      return { success: false, error: domainCheck.error };
    }

    try {
      const outputDir = path.join(process.cwd(), 'generated');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = Date.now();
      const imagePath = path.join(outputDir, `screenshot_${timestamp}.png`);
      
      await page.screenshot({ path: imagePath, fullPage: false });
      console.log(`[Browser] Captura guardada: ${imagePath}`);
      
      return { success: true, imagePath };
    } catch (err) {
      console.error('[Browser] Error capturando:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  async fillForm(sessionId: string, selector: string, value: string): Promise<{ success: boolean; error?: string }> {
    const page = this.pages.get(sessionId);
    if (!page) {
      return { success: false, error: 'No hay página activa' };
    }

    const domainCheck = await this.validateCurrentDomain(page);
    if (!domainCheck.allowed) {
      return { success: false, error: domainCheck.error };
    }

    try {
      await page.fill(selector, value);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async click(sessionId: string, selector: string): Promise<{ success: boolean; error?: string }> {
    const page = this.pages.get(sessionId);
    if (!page) {
      return { success: false, error: 'No hay página activa' };
    }

    const domainCheck = await this.validateCurrentDomain(page);
    if (!domainCheck.allowed) {
      return { success: false, error: domainCheck.error };
    }

    try {
      await page.click(selector);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getText(sessionId: string, selector?: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const page = this.pages.get(sessionId);
    if (!page) {
      return { success: false, error: 'No hay página activa' };
    }

    const domainCheck = await this.validateCurrentDomain(page);
    if (!domainCheck.allowed) {
      return { success: false, error: domainCheck.error };
    }

    try {
      let text: string;
      if (selector) {
        text = await page.textContent(selector) || '';
      } else {
        text = await page.evaluate(() => document.body.innerText);
      }
      return { success: true, text };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async closePage(sessionId: string): Promise<void> {
    const page = this.pages.get(sessionId);
    if (page) {
      await page.close();
      this.pages.delete(sessionId);
    }
  }

  async close(): Promise<void> {
    for (const page of this.pages.values()) {
      await page.close();
    }
    this.pages.clear();
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getAllowedDomains(): string[] {
    return [...ALLOWED_DOMAINS];
  }

  getBlockedDomains(): string[] {
    return [...BLOCKED_DOMAINS];
  }
}

export const browserService = new BrowserService();
