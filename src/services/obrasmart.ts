class ObraSmartService {
  private baseUrl: string;
  private email: string;
  private password: string;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.baseUrl = process.env.OBRASMART_URL || 'https://obrasmartpro.com';
    this.email = process.env.OBRASMART_USER || '';
    this.password = process.env.OBRASMART_PASS || '';
  }

  isConfigured(): boolean {
    return !!(this.email && this.password);
  }

  async login(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('ObraSmart no está configurado. Faltan credenciales.');
    }

    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    console.log('[ObraSmart] Iniciando sesión...');
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: this.email, 
        password: this.password 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ObraSmart] Error login:', errorText);
      throw new Error('Error de login en ObraSmart');
    }

    const data = await response.json();
    this.token = data.token;
    this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);
    
    console.log('[ObraSmart] Login exitoso');
    return this.token;
  }

  async generateBudget(descripcion: string, opciones?: {
    margen?: number;
    tipoCliente?: 'particular' | 'empresa' | 'promotora';
    calidad?: 'economica' | 'media' | 'alta' | 'premium';
  }): Promise<{
    id: string;
    referencia: string;
    total: number;
    texto: string;
  }> {
    const token = await this.login();

    console.log('[ObraSmart] Generando presupuesto con BertIA...');
    const response = await fetch(`${this.baseUrl}/api/ai-budgets/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        descripcion,
        margen: opciones?.margen || 30,
        tipoCliente: opciones?.tipoCliente || 'particular',
        calidad: opciones?.calidad || 'media'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ObraSmart] Error generando presupuesto:', errorText);
      throw new Error('Error generando presupuesto');
    }

    const data = await response.json();
    console.log('[ObraSmart] Presupuesto generado:', data.budget?.referencia);
    
    return {
      id: data.budget.id,
      referencia: data.budget.referencia,
      total: data.budget.total_con_iva,
      texto: data.budget.presupuesto_texto
    };
  }

  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    const token = await this.login();
    
    console.log('[ObraSmart] Transcribiendo audio...');
    const formData = new FormData();
    formData.append('audio', new Blob([audioBuffer]), filename);

    const response = await fetch(`${this.baseUrl}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ObraSmart] Error transcribiendo:', errorText);
      throw new Error('Error transcribiendo audio');
    }

    const data = await response.json();
    console.log('[ObraSmart] Audio transcrito');
    return data.text;
  }

  async downloadPdf(budgetId: string): Promise<Buffer> {
    const token = await this.login();

    console.log('[ObraSmart] Descargando PDF...');
    const response = await fetch(`${this.baseUrl}/api/ai-budgets/${budgetId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ObraSmart] Error descargando PDF:', errorText);
      throw new Error('Error descargando PDF');
    }

    console.log('[ObraSmart] PDF descargado');
    return Buffer.from(await response.arrayBuffer());
  }
}

export const obraSmartService = new ObraSmartService();
