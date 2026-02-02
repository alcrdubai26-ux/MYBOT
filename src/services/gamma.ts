import { browserService } from './browser.js';
import { aiService } from './ai.js';

interface PresentationSlide {
  title: string;
  content: string[];
  notes?: string;
}

interface PresentationStructure {
  title: string;
  subtitle?: string;
  slides: PresentationSlide[];
}

class GammaService {
  async generatePresentationStructure(topic: string, slideCount: number = 8): Promise<PresentationStructure> {
    const prompt = `Genera una estructura de presentación profesional sobre: "${topic}"
    
Formato JSON exacto:
{
  "title": "Título principal",
  "subtitle": "Subtítulo opcional",
  "slides": [
    {
      "title": "Título del slide",
      "content": ["Punto 1", "Punto 2", "Punto 3"],
      "notes": "Notas para el presentador"
    }
  ]
}

Requisitos:
- ${slideCount} slides en total
- Contenido profesional y conciso
- 3-5 puntos por slide
- Incluye: introducción, desarrollo y conclusión
- Solo devuelve el JSON, sin explicaciones`;

    try {
      const response = await aiService.processMessage('gamma:structure', prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No se pudo parsear la estructura');
    } catch (err) {
      console.error('[Gamma] Error generando estructura:', err);
      return {
        title: topic,
        slides: [
          { title: 'Introducción', content: ['Contenido por definir'] },
          { title: 'Desarrollo', content: ['Contenido por definir'] },
          { title: 'Conclusión', content: ['Contenido por definir'] }
        ]
      };
    }
  }

  async createPresentation(topic: string, slideCount: number = 8): Promise<{ success: boolean; message: string; structure?: PresentationStructure }> {
    console.log(`[Gamma] Generando presentación sobre: ${topic}`);
    
    const structure = await this.generatePresentationStructure(topic, slideCount);
    
    const gammaUrl = 'https://gamma.app/create/generate';
    const navResult = await browserService.navigate(gammaUrl, 'gamma');
    
    if (!navResult.success) {
      return {
        success: false,
        message: `No pude acceder a Gamma: ${navResult.error}. Aquí tienes la estructura generada para que la copies manualmente.`,
        structure
      };
    }

    const structureText = this.formatStructureForCopy(structure);
    
    return {
      success: true,
      message: `He generado la estructura de la presentación. Abre gamma.app/create/generate y pega este contenido:\n\n${structureText}`,
      structure
    };
  }

  private formatStructureForCopy(structure: PresentationStructure): string {
    let text = `# ${structure.title}\n`;
    if (structure.subtitle) {
      text += `${structure.subtitle}\n`;
    }
    text += '\n';

    for (const slide of structure.slides) {
      text += `## ${slide.title}\n`;
      for (const point of slide.content) {
        text += `- ${point}\n`;
      }
      text += '\n';
    }

    return text;
  }

  async getGammaLink(): Promise<string> {
    return 'https://gamma.app/create/generate';
  }
}

export const gammaService = new GammaService();
