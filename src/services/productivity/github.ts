import fetch from "node-fetch";

export class GitHubService {
  private token: string | null = null;

  constructor() {
    this.token = process.env.GITHUB_TOKEN || null;
  }

  /**
   * Ejecuta una acción de GitHub
   */
  async executeGitHubTool(name: string, args: any): Promise<string> {
    if (!this.token) return "Error: GITHUB_TOKEN no configurada.";

    try {
      if (name === "github_list_repos") {
        return JSON.stringify(await this.listRepos());
      }
      if (name === "github_create_issue") {
        return JSON.stringify(await this.createIssue(args.owner, args.repo, args.title, args.body));
      }
      if (name === "github_get_repo_contents") {
        return JSON.stringify(await this.getRepoContents(args.owner, args.repo, args.path));
      }
      return "Herramienta de GitHub no reconocida";
    } catch (err) {
      return `Error en GitHub: ${(err as Error).message}`;
    }
  }

  private async listRepos() {
    const res = await fetch("https://api.github.com/user/repos", {
      headers: { Authorization: `token ${this.token}`, Accept: "application/vnd.github.v3+json" },
    });
    return await res.json();
  }

  private async createIssue(owner: string, repo: string, title: string, body: string) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body }),
    });
    return await res.json();
  }

  private async getRepoContents(owner: string, repo: string, path: string = "") {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${this.token}`, Accept: "application/vnd.github.v3+json" },
    });
    return await res.json();
  }
}

export const githubService = new GitHubService();
