import type {
  NewsItem,
  NormalizedMatch,
  PlayerProfile,
  ResolvedPlayerEntity,
  ResolvedTeamEntity,
  TeamProfile
} from "../types/hltv.js";
import { asRecord, compact, pickArray, pickNumber, pickString } from "../utils/object.js";
import { normalizeDateTime } from "../utils/time.js";

function parseScore(record: Record<string, unknown>): string | undefined {
  const direct = pickString(record, ["score", "result", "scoreline"]);
  if (direct) {
    return direct;
  }

  const left = pickNumber(record, ["team1_score", "team1Score", "left_score", "leftScore"]);
  const right = pickNumber(record, ["team2_score", "team2Score", "right_score", "rightScore"]);

  if (left !== undefined && right !== undefined) {
    return `${left}:${right}`;
  }

  return undefined;
}

function parseOutcome(record: Record<string, unknown>, perspective?: string): NormalizedMatch["result"] {
  const direct = pickString(record, ["outcome", "result_status", "match_result"]);
  if (direct) {
    const normalized = direct.toLowerCase();
    if (normalized.includes("win")) {
      return "win";
    }
    if (normalized.includes("loss") || normalized.includes("lose")) {
      return "loss";
    }
    if (normalized.includes("draw")) {
      return "draw";
    }
  }

  const team1 = pickString(record, ["team1", "team1_name", "team1.name", "team1Name"]);
  const team2 = pickString(record, ["team2", "team2_name", "team2.name", "team2Name"]);
  const team1Score = pickNumber(record, ["team1_score", "team1Score"]);
  const team2Score = pickNumber(record, ["team2_score", "team2Score"]);

  if (!perspective || team1Score === undefined || team2Score === undefined) {
    return undefined;
  }

  if (team1Score === team2Score) {
    return "draw";
  }

  if (team1 === perspective) {
    return team1Score > team2Score ? "win" : "loss";
  }

  if (team2 === perspective) {
    return team2Score > team1Score ? "win" : "loss";
  }

  return undefined;
}

export function normalizeTeamProfile(
  raw: unknown,
  fallback: ResolvedTeamEntity
): TeamProfile {
  const record = asRecord(raw);
  if (!record) {
    return {
      id: fallback.id,
      name: fallback.name,
      slug: fallback.slug,
      country: fallback.country,
      rank: fallback.rank
    };
  }

  return {
    id: pickNumber(record, ["id", "team_id", "teamId"]) ?? fallback.id,
    name: pickString(record, ["name", "team_name", "teamName", "team"]) ?? fallback.name,
    slug: fallback.slug,
    country: pickString(record, ["country", "country_code", "countryCode"]) ?? fallback.country,
    rank: pickNumber(record, ["rank", "world_rank", "worldRank"]) ?? fallback.rank,
    raw_summary: pickString(record, ["summary", "description"])
  };
}

export function normalizePlayerProfile(
  raw: unknown,
  fallback: ResolvedPlayerEntity
): PlayerProfile {
  const record = asRecord(raw);
  if (!record) {
    return {
      id: fallback.id,
      name: fallback.name,
      slug: fallback.slug,
      team: fallback.team,
      country: fallback.country
    };
  }

  return {
    id: pickNumber(record, ["id", "player_id", "playerId"]) ?? fallback.id,
    name: pickString(record, ["name", "player_name", "playerName", "player"]) ?? fallback.name,
    slug: fallback.slug,
    team: pickString(record, ["team", "team_name", "teamName", "current_team"]) ?? fallback.team,
    country: pickString(record, ["country", "country_code", "countryCode"]) ?? fallback.country,
    raw_summary: pickString(record, ["summary", "description"])
  };
}

export function normalizeOverview(raw: unknown): Record<string, string | number> {
  const record = asRecord(raw);
  if (!record) {
    return {};
  }

  const keys = [
    "rating",
    "maps",
    "maps_played",
    "kills",
    "deaths",
    "kd_diff",
    "headshots",
    "adr",
    "kast",
    "impact"
  ];

  const entries = compact(
    keys.map((key) => {
      const rawValue = record[key];
      if (typeof rawValue === "number" || typeof rawValue === "string") {
        return [key, rawValue] as const;
      }

      return undefined;
    })
  );

  return Object.fromEntries(entries);
}

export function normalizeMatches(rawItems: unknown[], perspective?: string): NormalizedMatch[] {
  return compact(
    rawItems.map((item) => {
      const record = asRecord(item);
      if (!record) {
        return undefined;
      }

      const team1 = pickString(record, ["team1", "team1_name", "team1.name", "team1Name"]);
      const team2 = pickString(record, ["team2", "team2_name", "team2.name", "team2Name"]);
      const opponent =
        pickString(record, ["opponent", "opponent_name", "opponentName"]) ??
        (perspective && team1 === perspective ? team2 : perspective && team2 === perspective ? team1 : undefined);
      const scheduled = normalizeDateTime(
        pickString(record, ["scheduled_at", "date", "datetime", "time", "timestamp", "match_time"])
      );
      const playedAt = normalizeDateTime(
        pickString(record, ["played_at", "playedAt", "finished_at", "date", "datetime", "time", "timestamp"])
      );
      const result = parseOutcome(record, perspective);
      const score = parseScore(record);

      return {
        match_id: pickNumber(record, ["id", "match_id", "matchId"]),
        team1,
        team2,
        opponent,
        event: pickString(record, ["event", "event_name", "eventName", "event.name"]),
        result: score || playedAt ? result ?? "unknown" : "scheduled",
        score,
        winner: pickString(record, ["winner", "winner_name", "winnerName"]),
        best_of: pickString(record, ["best_of", "bestOf", "format"]),
        played_at: score ? playedAt : undefined,
        scheduled_at: score ? undefined : scheduled,
        map_text: pickString(record, ["map", "maps", "map_text", "mapText"])
      };
    })
  );
}

export function splitTeamMatches(matches: NormalizedMatch[]): {
  recent_results: NormalizedMatch[];
  upcoming_matches: NormalizedMatch[];
} {
  const recent_results = matches.filter((item) => item.score || item.played_at);
  const upcoming_matches = matches.filter((item) => !item.score && item.scheduled_at);

  return {
    recent_results,
    upcoming_matches
  };
}

export function normalizeResults(rawItems: unknown[]): NormalizedMatch[] {
  return normalizeMatches(rawItems);
}

export function normalizeUpcomingMatches(rawItems: unknown[]): NormalizedMatch[] {
  return normalizeMatches(rawItems).map((item) => ({
    ...item,
    result: "scheduled"
  }));
}

export function normalizeNews(rawItems: unknown[]): NewsItem[] {
  return compact(
    rawItems.map((item) => {
      const record = asRecord(item);
      if (!record) {
        return undefined;
      }

      const title = pickString(record, ["title", "headline", "name"]);
      if (!title) {
        return undefined;
      }

      return {
        title,
        link: pickString(record, ["link", "url"]),
        published_at: normalizeDateTime(
          pickString(record, ["published_at", "publishedAt", "date", "datetime", "timestamp"])
        ),
        summary_hint: pickString(record, ["summary", "description", "teaser"]),
        tag: pickString(record, ["tag", "topic", "category"])
      };
    })
  );
}

export function collectRecentHighlights(rawPlayer: unknown, rawOverview: unknown): string[] {
  const playerRecord = asRecord(rawPlayer);
  const overviewRecord = asRecord(rawOverview);
  const notes = new Set<string>();

  const achievements = playerRecord ? pickArray(playerRecord, ["achievements", "highlights"]) : undefined;
  for (const item of achievements ?? []) {
    if (typeof item === "string") {
      notes.add(item);
    } else {
      const record = asRecord(item);
      const value = record ? pickString(record, ["title", "name", "text"]) : undefined;
      if (value) {
        notes.add(value);
      }
    }
  }

  const rating = overviewRecord ? pickString(overviewRecord, ["rating"]) : undefined;
  if (rating) {
    notes.add(`近期 rating: ${rating}`);
  }

  return [...notes].slice(0, 5);
}
