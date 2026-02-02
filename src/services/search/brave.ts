import fetch from "node-fetch";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export class BraveSearchService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.BRAVE_API_KEY || "";
  }

  async search(query: string, count: number = 5): Promise<SearchResult[]> {
    if (!this.apiKey) {
      console.warn("[BraveSearch] API Key no configurada.");
      return [];
    }

    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
        {
          headers: {
            "X-Subscription-Token": this.apiKey,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Brave API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.web?.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        description: r.description,
      }));
    } catch (err) {
      console.error("[BraveSearch] Error en la búsqueda:", err);
      return [];
    }
  }

  /**
   * Realiza una búsqueda y devuelve un formato amigable para el modelo de lenguaje.
   */
  async searchFormatted(query: string): Promise<string> {
    const results = await this.search(query);
    if (results.length === 0) return "No se encontraron resultados en la web.";

    return results
      .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nResumen: ${r.description}`)
      .join("\n\n");
  }
}

export const braveSearchService = new BraveSearchService();
