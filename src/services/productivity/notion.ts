import { Client } from "@notionhq/client";

export class NotionService {
  private notion: Client | null = null;

  initialize(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  async createPage(parentDatabaseId: string, properties: any) {
    if (!this.notion) throw new Error("Notion not initialized");
    return await this.notion.pages.create({
      parent: { database_id: parentDatabaseId },
      properties,
    });
  }

  async queryDatabase(databaseId: string, filter?: any) {
    if (!this.notion) throw new Error("Notion not initialized");
    return await this.notion.databases.query({
      database_id: databaseId,
      filter,
    });
  }

  async updatePage(pageId: string, properties: any) {
    if (!this.notion) throw new Error("Notion not initialized");
    return await this.notion.pages.update({
      page_id: pageId,
      properties,
    });
  }
}

export const notionService = new NotionService();
