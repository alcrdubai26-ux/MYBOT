// @ts-ignore
import { google } from 'googleapis';

interface EmailAccount {
  provider: 'gmail' | 'outlook';
  email: string;
  isDefault: boolean;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: boolean;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{ filename: string; content: Buffer; mimeType: string }>;
}

let connectionSettings: any;

async function getGmailAccessToken() {
  if (connectionSettings?.settings?.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Token de Replit no encontrado');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  console.log('[Email] Connector response:', JSON.stringify(data, null, 2));
  
  connectionSettings = data.items?.[0];

  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  console.log('[Email] Access token found:', !!accessToken);

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail no conectado');
  }
  return accessToken;
}

async function getGmailClient() {
  const accessToken = await getGmailAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

class EmailService {
  private accounts: EmailAccount[] = [];
  private initialized: boolean = false;

  async initialize() {
    if (this.initialized) return;
    
    try {
      const gmail = await getGmailClient();
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      if (profile.data.emailAddress) {
        const existingAccount = this.accounts.find(a => a.email === profile.data.emailAddress);
        if (!existingAccount) {
          this.accounts.push({
            provider: 'gmail',
            email: profile.data.emailAddress,
            isDefault: this.accounts.length === 0
          });
          console.log(`[Email] Gmail conectado: ${profile.data.emailAddress}`);
        }
      }
      this.initialized = true;
    } catch (err) {
      console.log('[Email] Gmail no disponible:', (err as Error).message);
    }
  }

  getAccounts(): EmailAccount[] {
    return this.accounts;
  }

  getDefaultAccount(): EmailAccount | undefined {
    return this.accounts.find(a => a.isDefault) || this.accounts[0];
  }

  setDefaultAccount(email: string): boolean {
    const account = this.accounts.find(a => a.email === email);
    if (!account) return false;
    
    this.accounts.forEach(a => a.isDefault = false);
    account.isDefault = true;
    return true;
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const fromAccount = options.from 
      ? this.accounts.find(a => a.email === options.from)
      : this.getDefaultAccount();

    if (!fromAccount) {
      return { success: false, error: 'No hay cuenta de correo configurada' };
    }

    try {
      if (fromAccount.provider === 'gmail') {
        return await this.sendGmail(options, fromAccount.email);
      }
      return { success: false, error: 'Proveedor no soportado' };
    } catch (err) {
      console.error('[Email] Error enviando:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  private async sendGmail(options: SendEmailOptions, from: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const gmail = await getGmailClient();
    
    const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    
    let emailContent = [
      `From: ${from}`,
      `To: ${toAddresses}`,
      `Subject: ${options.subject}`,
      options.cc ? `Cc: ${options.cc.join(', ')}` : '',
      options.bcc ? `Bcc: ${options.bcc.join(', ')}` : '',
      `Content-Type: ${options.html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      options.body
    ].filter(Boolean).join('\r\n');

    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`[Email] Correo enviado desde ${from} a ${toAddresses}`);
    return { success: true, messageId: result.data.id || undefined };
  }

  async getRecentEmails(count: number = 10, from?: string): Promise<any[]> {
    const account = from 
      ? this.accounts.find(a => a.email === from)
      : this.getDefaultAccount();

    if (!account || account.provider !== 'gmail') {
      return [];
    }

    try {
      const gmail = await getGmailClient();
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: count
      });

      const emails = [];
      for (const msg of response.data.messages || []) {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });
        
        const headers: Array<{name?: string; value?: string}> = full.data.payload?.headers || [];
        emails.push({
          id: msg.id,
          from: headers.find((h: {name?: string; value?: string}) => h.name === 'From')?.value,
          to: headers.find((h: {name?: string; value?: string}) => h.name === 'To')?.value,
          subject: headers.find((h: {name?: string; value?: string}) => h.name === 'Subject')?.value,
          date: headers.find((h: {name?: string; value?: string}) => h.name === 'Date')?.value,
          snippet: full.data.snippet
        });
      }
      return emails;
    } catch (err) {
      console.error('[Email] Error obteniendo correos:', err);
      return [];
    }
  }

  async searchEmails(query: string, count: number = 10): Promise<any[]> {
    const account = this.getDefaultAccount();
    if (!account || account.provider !== 'gmail') {
      return [];
    }

    try {
      const gmail = await getGmailClient();
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: count
      });

      const emails = [];
      for (const msg of response.data.messages || []) {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });
        
        const headers: Array<{name?: string; value?: string}> = full.data.payload?.headers || [];
        emails.push({
          id: msg.id,
          from: headers.find((h: {name?: string; value?: string}) => h.name === 'From')?.value,
          to: headers.find((h: {name?: string; value?: string}) => h.name === 'To')?.value,
          subject: headers.find((h: {name?: string; value?: string}) => h.name === 'Subject')?.value,
          date: headers.find((h: {name?: string; value?: string}) => h.name === 'Date')?.value,
          snippet: full.data.snippet
        });
      }
      return emails;
    } catch (err) {
      console.error('[Email] Error buscando correos:', err);
      return [];
    }
  }
}

export const emailService = new EmailService();
