const LEETIFY_API_BASE = "https://leetlens.wigz.workers.dev";

export const PRO_PLAYERS = {
  donk: { steamId: "76561198386265483", name: "donk", team: "Team Spirit" },
} as const;

export type ProPlayerId = keyof typeof PRO_PLAYERS;

export interface MapStats {
  mapName: string;
  wins: number;
  losses: number;
  ties: number;
  total: number;
  winRate: number;
}

export interface LeetifyProfile {
  steamId: string;
  name: string;
  leetifyRating: number | null;
  premierRank: number | null;
  faceitLevel: number | null;
  faceitElo: number | null;
  aim: number | null;
  utility: number | null;
  positioning: number | null;
  clutch: number | null;
  opening: number | null;
  ctRating: number | null;
  tRating: number | null;
  gamesPlayed: number;
  winRate: number | null;
  headshotPct: number | null;
  reactionTimeMs: number | null;
  topMaps: MapStats[];
  hasBans: boolean;
}

const cache = new Map<string, { data: LeetifyProfile | null; timestamp: number }>();
const pendingRequests = new Map<string, Promise<LeetifyProfile | null>>();
const CACHE_TTL = 30 * 60 * 1000;
const REQUEST_DELAY = 1500;

let requestQueue: Array<{ steam64Id: string; resolve: (data: LeetifyProfile | null) => void }> = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const item = requestQueue.shift();
    if (!item) continue;
    
    const { steam64Id, resolve } = item;
    
    const cached = cache.get(steam64Id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      resolve(cached.data);
      continue;
    }
    
    try {
      const data = await doFetchProfile(steam64Id);
      resolve(data);
    } catch (e) {
      console.error("[LeetLens] Queue fetch error:", e);
      resolve(null);
    }
    
    if (requestQueue.length > 0) {
      await new Promise(r => setTimeout(r, REQUEST_DELAY));
    }
  }
  
  isProcessingQueue = false;
}

async function doFetchProfile(steam64Id: string): Promise<LeetifyProfile | null> {
  try {
    const response = await fetch(`${LEETIFY_API_BASE}/profile/${steam64Id}`, {
      headers: { 
        "Accept": "application/json",
      },
    });

    if (response.status === 429) {
      console.log("[LeetLens] Rate limited for", steam64Id);
      cache.set(steam64Id, { data: null, timestamp: Date.now() });
      return null;
    }

    if (response.status === 404 || !response.ok) {
      console.log("[LeetLens] Player not found or error:", steam64Id, response.status);
      cache.set(steam64Id, { data: null, timestamp: Date.now() });
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      console.log("[LeetLens] API error:", data.error);
      cache.set(steam64Id, { data: null, timestamp: Date.now() });
      return null;
    }

    const topMaps = calculateMapStats(data?.recent_matches || []);

    const profile: LeetifyProfile = {
      steamId: steam64Id,
      name: data?.name || "Unknown",
      leetifyRating: data?.ranks?.leetify ?? null,
      premierRank: data?.ranks?.premier ?? null,
      faceitLevel: data?.ranks?.faceit ?? null,
      faceitElo: data?.ranks?.faceit_elo ?? null,
      aim: data?.rating?.aim ?? null,
      utility: data?.rating?.utility ?? null,
      positioning: data?.rating?.positioning ?? null,
      clutch: data?.rating?.clutch ?? null,
      opening: data?.rating?.opening ?? null,
      ctRating: data?.rating?.ct_leetify ?? null,
      tRating: data?.rating?.t_leetify ?? null,
      gamesPlayed: data?.total_matches ?? 0,
      winRate: data?.winrate != null ? data.winrate * 100 : null,
      headshotPct: data?.stats?.accuracy_head ?? null,
      reactionTimeMs: data?.stats?.reaction_time_ms ?? null,
      topMaps,
      hasBans: Array.isArray(data?.bans) && data.bans.length > 0,
    };

    console.log("[LeetLens] Profile loaded:", steam64Id, "LR:", profile.leetifyRating);
    cache.set(steam64Id, { data: profile, timestamp: Date.now() });
    return profile;
  } catch (error) {
    console.error("[LeetLens] Fetch error for", steam64Id, error);
    cache.set(steam64Id, { data: null, timestamp: Date.now() });
    return null;
  }
}

function calculateMapStats(recentMatches: any[]): MapStats[] {
  const mapData = new Map<string, { wins: number; losses: number; ties: number }>();
  
  for (const match of recentMatches) {
    const mapName = match.map_name;
    if (!mapName) continue;
    
    if (!mapData.has(mapName)) {
      mapData.set(mapName, { wins: 0, losses: 0, ties: 0 });
    }
    
    const stats = mapData.get(mapName)!;
    if (match.outcome === "win") stats.wins++;
    else if (match.outcome === "loss") stats.losses++;
    else if (match.outcome === "tie") stats.ties++;
  }
  
  const mapStats: MapStats[] = [];
  for (const [mapName, stats] of mapData) {
    const total = stats.wins + stats.losses + stats.ties;
    if (total >= 3) {
      mapStats.push({
        mapName: mapName.replace("de_", "").replace("cs_", ""),
        wins: stats.wins,
        losses: stats.losses,
        ties: stats.ties,
        total,
        winRate: total > 0 ? (stats.wins / total) * 100 : 0,
      });
    }
  }
  
  return mapStats.sort((a, b) => b.total - a.total).slice(0, 5);
}

export function fetchLeetifyProfile(steam64Id: string): Promise<LeetifyProfile | null> {
  const cached = cache.get(steam64Id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }

  const pending = pendingRequests.get(steam64Id);
  if (pending) {
    return pending;
  }

  const promise = new Promise<LeetifyProfile | null>((resolve) => {
    requestQueue.push({ steam64Id, resolve });
    processQueue();
  });

  pendingRequests.set(steam64Id, promise);
  
  promise.finally(() => {
    pendingRequests.delete(steam64Id);
  });

  return promise;
}

interface MatchData {
  teams: {
    team1: { name: string; players: { oddjobId: string; steamId: string; nickname: string }[] };
    team2: { name: string; players: { oddjobId: string; steamId: string; nickname: string }[] };
  };
  playerMap: Map<string, string>;
  mapName: string | null;
}

let matchDataCache: { url: string; data: MatchData } | null = null;
let matchDataPending: Promise<MatchData | null> | null = null;

export async function fetchMatchData(): Promise<MatchData | null> {
  const currentUrl = location.href;
  
  if (matchDataCache && matchDataCache.url === currentUrl) {
    return matchDataCache.data;
  }

  if (matchDataPending) {
    return matchDataPending;
  }

  const matchIdMatch = /\/room\/([a-f0-9-]+)/i.exec(currentUrl);
  if (!matchIdMatch) {
    return null;
  }

  matchDataPending = (async () => {
    const matchId = matchIdMatch[1];
    console.log("[LeetLens] Fetching match data:", matchId);

    try {
      const response = await fetch(`https://www.faceit.com/api/match/v2/match/${matchId}`);
      if (!response.ok) {
        console.log("[LeetLens] Match API error:", response.status);
        return null;
      }

      const data = await response.json();
      const teams = data.payload?.teams;
      if (!teams) {
        console.log("[LeetLens] No teams in response");
        return null;
      }

      const teamEntries = Object.entries(teams) as [string, any][];
      if (teamEntries.length < 2) return null;

      const playerMap = new Map<string, string>();
      
      const buildTeam = (teamData: any) => {
        const players: { oddjobId: string; steamId: string; nickname: string }[] = [];
        const roster = teamData.roster || [];
        
        for (const player of roster) {
          if (player.gameId) {
            players.push({
              oddjobId: player.id,
              steamId: player.gameId,
              nickname: player.nickname,
            });
            playerMap.set(player.id, player.gameId);
            playerMap.set(player.nickname, player.gameId);
          }
        }
        return { name: teamData.name || "Team", players };
      };

      const matchData: MatchData = {
        teams: {
          team1: buildTeam(teamEntries[0][1]),
          team2: buildTeam(teamEntries[1][1]),
        },
        playerMap,
        mapName: data.payload?.voting?.map?.pick?.[0] || data.payload?.configurationOverride?.entityCustom?.map || null,
      };

      matchDataCache = { url: currentUrl, data: matchData };
      const totalPlayers = matchData.teams.team1.players.length + matchData.teams.team2.players.length;
      console.log("[LeetLens] Match data loaded, players:", totalPlayers, "map:", matchData.mapName);
      return matchData;
    } catch (error) {
      console.error("[LeetLens] Failed to fetch match data:", error);
      return null;
    } finally {
      matchDataPending = null;
    }
  })();

  return matchDataPending;
}

export function resetMatchCache() {
  matchDataCache = null;
  matchDataPending = null;
}

export interface TeamData {
  name: string;
  players: LeetifyProfile[];
  avgLeetifyRating: number;
  avgPremierRank: number;
  avgFaceitElo: number;
  avgAim: number;
  avgWinRate: number;
  avgMapWinRate: number | null;
}

export function calculateWinProbability(team1: TeamData, team2: TeamData): { team1: number; team2: number } {
  const hasMapData = team1.avgMapWinRate !== null && team2.avgMapWinRate !== null;
  
  const weights = {
    leetifyRating: 0.25,
    premierRank: 0.20,
    faceitElo: 0.25,
    aim: 0.15,
    winRate: hasMapData ? 0.05 : 0.15,
    mapWinRate: hasMapData ? 0.10 : 0,
  };

  function normalizeValue(val: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  }

  function getTeamScore(team: TeamData): number {
    let score = 0;
    score += normalizeValue(team.avgLeetifyRating, -10, 10) * weights.leetifyRating;
    score += normalizeValue(team.avgPremierRank, 0, 35000) * weights.premierRank;
    score += normalizeValue(team.avgFaceitElo, 500, 4000) * weights.faceitElo;
    score += normalizeValue(team.avgAim, 0, 100) * weights.aim;
    score += normalizeValue(team.avgWinRate, 0, 100) * weights.winRate;
    if (hasMapData && team.avgMapWinRate !== null) {
      score += normalizeValue(team.avgMapWinRate, 0, 100) * weights.mapWinRate;
    }
    return score;
  }

  const score1 = getTeamScore(team1);
  const score2 = getTeamScore(team2);
  const total = score1 + score2;

  if (total === 0) {
    return { team1: 50, team2: 50 };
  }

  const diff = Math.abs(score1 - score2);
  const maxSwing = 0.35;
  const swing = Math.min(diff * 2, maxSwing);
  
  let prob1 = 0.5;
  if (score1 > score2) {
    prob1 = 0.5 + swing;
  } else if (score2 > score1) {
    prob1 = 0.5 - swing;
  }

  return {
    team1: Math.round(prob1 * 100),
    team2: Math.round((1 - prob1) * 100),
  };
}

export function buildTeamData(players: LeetifyProfile[], teamName: string, mapName?: string | null): TeamData {
  const validPlayers = players.filter(p => p !== null);
  
  const avg = (arr: (number | null)[], fallback: number) => {
    const valid = arr.filter((v): v is number => v !== null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : fallback;
  };

  let avgMapWinRate: number | null = null;
  if (mapName) {
    const normalizedMap = mapName.replace("de_", "").replace("cs_", "").toLowerCase();
    const mapWinRates: number[] = [];
    
    for (const player of validPlayers) {
      const mapStats = player.topMaps.find(m => m.mapName.toLowerCase() === normalizedMap);
      if (mapStats && mapStats.total >= 3) {
        mapWinRates.push(mapStats.winRate);
      }
    }
    
    if (mapWinRates.length >= 2) {
      avgMapWinRate = mapWinRates.reduce((a, b) => a + b, 0) / mapWinRates.length;
    }
  }

  return {
    name: teamName,
    players: validPlayers,
    avgLeetifyRating: avg(validPlayers.map(p => p.leetifyRating), 0),
    avgPremierRank: avg(validPlayers.map(p => p.premierRank), 10000),
    avgFaceitElo: avg(validPlayers.map(p => p.faceitElo), 1500),
    avgAim: avg(validPlayers.map(p => p.aim), 50),
    avgWinRate: avg(validPlayers.map(p => p.winRate), 50),
    avgMapWinRate,
  };
}

const proPlayerCache = new Map<string, LeetifyProfile | null>();

export async function fetchProPlayerProfile(proId: ProPlayerId): Promise<LeetifyProfile | null> {
  const proPlayer = PRO_PLAYERS[proId];
  
  if (proPlayerCache.has(proPlayer.steamId)) {
    return proPlayerCache.get(proPlayer.steamId) || null;
  }

  const cached = cache.get(proPlayer.steamId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    proPlayerCache.set(proPlayer.steamId, cached.data);
    return cached.data;
  }

  try {
    const profile = await doFetchProfile(proPlayer.steamId);
    proPlayerCache.set(proPlayer.steamId, profile);
    return profile;
  } catch (e) {
    console.error("[LeetLens] Failed to fetch pro player:", proId, e);
    return null;
  }
}
