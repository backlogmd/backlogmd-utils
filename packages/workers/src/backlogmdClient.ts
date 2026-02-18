import { AgentWorkItem } from "./types.js";

export class BacklogHttpClient {
    baseUrl: string;
    constructor(url: string) {
        this.baseUrl = url;
    }
    getUrl(path: string) {
        return `${this.baseUrl}${path}`;
    }
    async getAvailableWork(): AgentWorkItem[] {
        const reponse = await fetch(this.getUrl("/work"));
    }
}
