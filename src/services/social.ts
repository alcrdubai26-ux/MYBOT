interface SocialAccount {
  platform: 'instagram' | 'tiktok' | 'facebook';
  accountName: string;
  accountId: string;
  isConnected: boolean;
}

interface PostDraft {
  id: string;
  userId: string;
  platform: 'instagram' | 'tiktok' | 'facebook';
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  scheduledFor?: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'failed';
  createdAt: Date;
  expiresAt: Date;
  approvalToken?: string;
}

interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  engagement: number;
}

const ACTIONS_NO_CONFIRMATION = [
  'view_metrics',
  'view_messages',
  'view_comments',
  'analyze_performance',
  'search_trends',
  'search_hashtags',
  'prepare_draft',
  'get_best_times',
  'get_content_ideas',
];

const ACTIONS_REQUIRE_CONFIRMATION = [
  'publish_post',
  'reply_comment',
  'send_dm',
  'schedule_post',
  'delete_post',
];

class SocialMediaService {
  private accounts: SocialAccount[] = [];
  private drafts: Map<string, PostDraft> = new Map();
  private pendingActions: Map<string, { action: string; data: any; callback: () => Promise<any> }> = new Map();
  
  private metaAccessToken: string | null = null;
  private tiktokAccessToken: string | null = null;

  initialize(config: { metaAccessToken?: string; tiktokAccessToken?: string }) {
    if (config.metaAccessToken) {
      this.metaAccessToken = config.metaAccessToken;
      console.log('[Social] Meta (Instagram/Facebook) configurado');
    }
    if (config.tiktokAccessToken) {
      this.tiktokAccessToken = config.tiktokAccessToken;
      console.log('[Social] TikTok configurado');
    }
  }

  isConfigured(): boolean {
    return !!(this.metaAccessToken || this.tiktokAccessToken);
  }

  requiresConfirmation(action: string): boolean {
    return ACTIONS_REQUIRE_CONFIRMATION.includes(action);
  }

  getConnectedAccounts(): SocialAccount[] {
    return this.accounts;
  }

  async generatePostContent(topic: string, platform: 'instagram' | 'tiktok' | 'facebook'): Promise<string> {
    const platformGuides = {
      instagram: 'máximo 2200 caracteres, usa emojis con moderación, incluye llamada a la acción',
      tiktok: 'máximo 300 caracteres, tono informal y directo, usa tendencias actuales',
      facebook: 'máximo 500 caracteres para mejor engagement, tono profesional pero cercano',
    };

    return `[Borrador para ${platform}]\n\nTema: ${topic}\n\nGuía: ${platformGuides[platform]}\n\n(Contenido pendiente de generar con IA)`;
  }

  async suggestHashtags(topic: string, platform: string): Promise<string[]> {
    const baseHashtags = ['#construccion', '#reformas', '#presupuestos', '#obrasmart', '#obra'];
    const topicHashtags = topic.toLowerCase().split(' ').map(w => `#${w.replace(/[^a-z0-9]/g, '')}`);
    return [...new Set([...baseHashtags, ...topicHashtags])].slice(0, 15);
  }

  async getBestPostingTimes(platform: string): Promise<{ day: string; times: string[] }[]> {
    const bestTimes = [
      { day: 'Lunes', times: ['9:00', '12:00', '18:00'] },
      { day: 'Martes', times: ['9:00', '12:00', '17:00'] },
      { day: 'Miércoles', times: ['9:00', '11:00', '18:00'] },
      { day: 'Jueves', times: ['9:00', '12:00', '17:00'] },
      { day: 'Viernes', times: ['9:00', '11:00', '14:00'] },
      { day: 'Sábado', times: ['10:00', '12:00'] },
      { day: 'Domingo', times: ['10:00', '19:00'] },
    ];
    return bestTimes;
  }

  async getContentIdeas(niche: string = 'construcción'): Promise<string[]> {
    return [
      'Antes/Después de una reforma',
      'Tips rápidos de presupuestos',
      'Errores comunes al contratar obras',
      'Tutorial: Cómo usar ObraSmart Pro',
      'Testimonios de clientes',
      'Tendencias en construcción 2026',
      'Detrás de cámaras de una obra',
      'Respuestas a preguntas frecuentes',
      'Comparativa de materiales',
      'Caso de éxito de un proyecto',
    ];
  }

  createDraft(userId: string, platform: 'instagram' | 'tiktok' | 'facebook', content: string, hashtags?: string[]): PostDraft {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const draft: PostDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      platform,
      content,
      hashtags,
      status: 'draft',
      createdAt: new Date(),
      expiresAt,
    };
    this.drafts.set(draft.id, draft);
    return draft;
  }

  getUserDrafts(userId: string): PostDraft[] {
    const now = new Date();
    return Array.from(this.drafts.values())
      .filter(d => d.userId === userId && d.expiresAt > now);
  }

  getDrafts(): PostDraft[] {
    return Array.from(this.drafts.values());
  }

  async requestPublishApproval(userId: string, draftId: string): Promise<{ needsApproval: true; previewMessage: string; draftId: string; approvalToken: string }> {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new Error('Borrador no encontrado');
    }

    if (draft.userId !== userId) {
      throw new Error('No tienes permiso para publicar este borrador');
    }

    if (draft.expiresAt < new Date()) {
      this.drafts.delete(draftId);
      throw new Error('Borrador expirado');
    }

    const approvalToken = `approve_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    draft.status = 'pending_approval';
    draft.approvalToken = approvalToken;
    
    const hashtagsText = draft.hashtags?.join(' ') || '';
    const previewMessage = `¿Publico esto en ${draft.platform}?\n\n---\n${draft.content}\n${hashtagsText}\n---\n\nResponde "Sí", "Dale" o "Ok" para publicar.`;
    
    return {
      needsApproval: true,
      previewMessage,
      draftId,
      approvalToken,
    };
  }

  async confirmAndPublish(userId: string, draftId: string, approvalToken: string): Promise<{ success: boolean; message: string; postUrl?: string }> {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      return { success: false, message: 'Borrador no encontrado' };
    }

    if (draft.userId !== userId) {
      return { success: false, message: 'No tienes permiso para publicar este borrador' };
    }

    if (draft.approvalToken !== approvalToken) {
      return { success: false, message: 'Token de aprobación inválido' };
    }

    if (draft.expiresAt < new Date()) {
      this.drafts.delete(draftId);
      return { success: false, message: 'Borrador expirado' };
    }

    if (draft.status !== 'pending_approval') {
      return { success: false, message: 'Este borrador no está pendiente de aprobación' };
    }

    try {
      let result;
      switch (draft.platform) {
        case 'instagram':
          result = await this.publishToInstagram(draft);
          break;
        case 'facebook':
          result = await this.publishToFacebook(draft);
          break;
        case 'tiktok':
          result = await this.publishToTikTok(draft);
          break;
      }

      if (result.success) {
        draft.status = 'published';
        return { success: true, message: `Publicado en ${draft.platform}`, postUrl: result.postUrl };
      } else {
        draft.status = 'failed';
        return { success: false, message: result.error || 'Error al publicar' };
      }
    } catch (err) {
      draft.status = 'failed';
      return { success: false, message: (err as Error).message };
    }
  }

  private async publishToInstagram(draft: PostDraft): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    if (!this.metaAccessToken) {
      return { success: false, error: 'Instagram no está configurado. Se necesita META_ACCESS_TOKEN.' };
    }

    console.log(`[Social] Publicando en Instagram: ${draft.content.substring(0, 50)}...`);
    return { success: false, error: 'Instagram API pendiente de configurar con credenciales reales' };
  }

  private async publishToFacebook(draft: PostDraft): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    if (!this.metaAccessToken) {
      return { success: false, error: 'Facebook no está configurado. Se necesita META_ACCESS_TOKEN.' };
    }

    console.log(`[Social] Publicando en Facebook: ${draft.content.substring(0, 50)}...`);
    return { success: false, error: 'Facebook API pendiente de configurar con credenciales reales' };
  }

  private async publishToTikTok(draft: PostDraft): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    if (!this.tiktokAccessToken) {
      return { success: false, error: 'TikTok no está configurado. Se necesita TIKTOK_ACCESS_TOKEN.' };
    }

    console.log(`[Social] Publicando en TikTok: ${draft.content.substring(0, 50)}...`);
    return { success: false, error: 'TikTok API pendiente de configurar con credenciales reales' };
  }

  async getMetrics(platform: string): Promise<PostMetrics | null> {
    console.log(`[Social] Obteniendo métricas de ${platform}`);
    return {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      reach: 0,
      engagement: 0,
    };
  }

  isApprovalResponse(text: string): boolean {
    const approvalPatterns = [
      /^s[ií]$/i,
      /^dale$/i,
      /^ok$/i,
      /^vale$/i,
      /^adelante$/i,
      /^publica$/i,
      /^hazlo$/i,
      /^confirmo$/i,
    ];
    return approvalPatterns.some(p => p.test(text.trim()));
  }

  isRejectionResponse(text: string): boolean {
    const rejectionPatterns = [
      /^no$/i,
      /^cancel/i,
      /^para$/i,
      /^espera$/i,
      /^nada$/i,
    ];
    return rejectionPatterns.some(p => p.test(text.trim()));
  }
}

export const socialService = new SocialMediaService();
