import type { ResolvedPlayerEntity } from "../types/hltv.js";
import type { HltvApiClient } from "../clients/hltvApiClient.js";
import { asRecord, pickNumber, pickString } from "../utils/object.js";
import { equalsIgnoreCase, includesIgnoreCase } from "../utils/strings.js";

const PLAYER_ALIAS_DICTIONARY: Record<string, string[]> = {
  monesy: ["m0NESY"],
  zywoo: ["ZywOo"],
  simple: ["s1mple"]
};

export class PlayerResolver {
  constructor(private readonly client: HltvApiClient) {}

  async resolve(name: string, exact = false, limit = 5): Promise<ResolvedPlayerEntity[]> {
    const queries = [name, ...(PLAYER_ALIAS_DICTIONARY[name.toLowerCase()] ?? [])];
    const results = new Map<number, ResolvedPlayerEntity>();

    for (const query of queries) {
      const items = await this.client.searchPlayers(query);
      for (const item of items) {
        const normalized = this.normalizePlayer(item, name);
        if (normalized) {
          results.set(normalized.id, normalized);
        }
      }
    }

    const sorted = [...results.values()].sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
    return exact ? sorted.filter((item) => equalsIgnoreCase(item.name, name)).slice(0, limit) : sorted.slice(0, limit);
  }

  private normalizePlayer(raw: unknown, originalQuery: string): ResolvedPlayerEntity | undefined {
    const record = asRecord(raw);
    if (!record) {
      return undefined;
    }

    const id = pickNumber(record, ["id", "player_id", "playerId"]);
    const name = pickString(record, ["name", "player_name", "playerName", "player"]);
    if (!id || !name) {
      return undefined;
    }

    const team = pickString(record, ["team", "team_name", "teamName", "current_team"]);
    const country = pickString(record, ["country", "country_code", "countryCode"]);
    const score = this.scoreMatch(name, originalQuery);

    return {
      type: "player",
      id,
      name,
      slug: this.client.buildSlug(name, id),
      team,
      country,
      score,
      aliases: PLAYER_ALIAS_DICTIONARY[originalQuery.toLowerCase()] ?? []
    };
  }

  private scoreMatch(candidate: string, query: string): number {
    if (equalsIgnoreCase(candidate, query)) {
      return 1;
    }

    if (includesIgnoreCase(candidate, query)) {
      return 0.85;
    }

    return 0.5;
  }
}
