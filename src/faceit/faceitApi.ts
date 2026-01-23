const API_BASE = "https://leetlens.wigz.workers.dev";

export interface MapStats {
  mapName: string;
  matches: number;
  wins: number;
  winRate: number;
  avgKills: number;
  avgDeaths: number;
  avgKD: number;
  avgHS: number;
}

export interface PlayerProfile {
  oddjobId: string;
  steamId: string;
  nickname: string;
  elo: number | null;
  skillLevel: number | null;
  matches: number;
  wins: number;
  winRate: number | null;
  kdRatio: number | null;
  krRatio: number | null;
  headshotPct: number | null;
  avgKills: number | null;
  avgDeaths: number | null;
  longestWinStreak: number | null;
  currentWinStreak: number | null;
  recentWinRate: number | null;
  topMaps: MapStats[];
  country: string | null;
}

const cache = new Map<string, { data: PlayerProfile | null; timestamp: number }>();
const pendingRequests = new Map<string, Promise<PlayerProfile | null>>();
const CACHE_TTL = 30 * 60 * 1000;
const BATCH_SIZE = 10;
const BATCH_DELAY = 1000;

let requestQueue: Array<{ oddjobId: string; resolve: (data: PlayerProfile | null) => void }> = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const batch = requestQueue.splice(0, BATCH_SIZE);
    
    const batchPromises = batch.map(async ({ oddjobId, resolve }) => {
      const cached = cache.get(oddjobId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        resolve(cached.data);
        return;
      }
      
      try {
        const data = await doFetchProfile(oddjobId);
        resolve(data);
      } catch (e) {
        console.error("[LeetLens] Batch fetch error:", e);
        resolve(null);
      }
    });
    
    await Promise.all(batchPromises);
    
    if (requestQueue.length > 0) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }
  
  isProcessingQueue = false;
}

async function doFetchProfile(oddjobId: string): Promise<PlayerProfile | null> {
  try {
    const [playerRes, statsRes, historyRes] = await Promise.all([
      fetch(`${API_BASE}/player/${oddjobId}`, { headers: { "Accept": "application/json" } }),
      fetch(`${API_BASE}/stats/${oddjobId}`, { headers: { "Accept": "application/json" } }),
      fetch(`${API_BASE}/history/${oddjobId}`, { headers: { "Accept": "application/json" } }),
    ]);

    if (!playerRes.ok) {
      console.log("[LeetLens] Player not found:", oddjobId, playerRes.status);
      cache.set(oddjobId, { data: null, timestamp: Date.now() });
      return null;
    }

    const playerData = await playerRes.json();
    const statsData = statsRes.ok ? await statsRes.json() : null;
    const historyData = historyRes.ok ? await historyRes.json() : null;

    const cs2Stats = playerData?.games?.cs2;
    const lifetime = statsData?.lifetime;
    const segments = statsData?.segments || [];

    const recentMatches = historyData?.items || [];
    const recentWins = recentMatches.filter((m: any) => {
      const result = m.results?.winner;
      const playerTeam = Object.entries(m.teams || {}).find(([_, t]: [string, any]) => 
        t.players?.some((p: any) => p.player_id === oddjobId)
      );
      return playerTeam && playerTeam[0] === result;
    }).length;
    const recentWinRate = recentMatches.length > 0 ? (recentWins / recentMatches.length) * 100 : null;

    const topMaps: MapStats[] = segments
      .filter((s: any) => s.type === "Map" && s.stats)
      .map((s: any) => ({
        mapName: s.label?.replace("de_", "").replace("cs_", "") || s.segment_id,
        matches: parseInt(s.stats.Matches) || 0,
        wins: parseInt(s.stats.Wins) || 0,
        winRate: parseFloat(s.stats["Win Rate %"]) || 0,
        avgKills: parseFloat(s.stats["Average Kills"]) || 0,
        avgDeaths: parseFloat(s.stats["Average Deaths"]) || 0,
        avgKD: parseFloat(s.stats["Average K/D Ratio"]) || 0,
        avgHS: parseFloat(s.stats["Average Headshots %"]) || 0,
      }))
      .filter((m: MapStats) => m.matches >= 3)
      .sort((a: MapStats, b: MapStats) => b.matches - a.matches)
      .slice(0, 5);

    const profile: PlayerProfile = {
      oddjobId,
      steamId: cs2Stats?.game_player_id || "",
      nickname: playerData?.nickname || "Unknown",
      elo: cs2Stats?.faceit_elo ?? null,
      skillLevel: cs2Stats?.skill_level ?? null,
      matches: parseInt(lifetime?.Matches) || 0,
      wins: parseInt(lifetime?.Wins) || 0,
      winRate: parseFloat(lifetime?.["Win Rate %"]) || null,
      kdRatio: parseFloat(lifetime?.["Average K/D Ratio"]) || null,
      krRatio: parseFloat(lifetime?.["Average K/R Ratio"]) || null,
      headshotPct: parseFloat(lifetime?.["Average Headshots %"]) || null,
      avgKills: parseFloat(lifetime?.["Average Kills"]) || null,
      avgDeaths: parseFloat(lifetime?.["Average Deaths"]) || null,
      longestWinStreak: parseInt(lifetime?.["Longest Win Streak"]) || null,
      currentWinStreak: parseInt(lifetime?.["Current Win Streak"]) || null,
      recentWinRate,
      topMaps,
      country: playerData?.country || null,
    };

    console.log("[LeetLens] Profile loaded:", oddjobId, "ELO:", profile.elo, "WR:", profile.winRate);
    cache.set(oddjobId, { data: profile, timestamp: Date.now() });
    return profile;
  } catch (error) {
    console.error("[LeetLens] Fetch error for", oddjobId, error);
    cache.set(oddjobId, { data: null, timestamp: Date.now() });
    return null;
  }
}

export function fetchPlayerProfile(oddjobId: string): Promise<PlayerProfile | null> {
  const cached = cache.get(oddjobId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }

  const pending = pendingRequests.get(oddjobId);
  if (pending) {
    return pending;
  }

  const promise = new Promise<PlayerProfile | null>((resolve) => {
    requestQueue.push({ oddjobId, resolve });
    processQueue();
  });

  pendingRequests.set(oddjobId, promise);
  
  promise.finally(() => {
    pendingRequests.delete(oddjobId);
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
          players.push({
            oddjobId: player.id,
            steamId: player.gameId || "",
            nickname: player.nickname,
          });
          playerMap.set(player.id, player.id);
          playerMap.set(player.nickname, player.id);
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
  players: PlayerProfile[];
  avgElo: number;
  avgSkillLevel: number;
  avgKD: number;
  avgWinRate: number;
  avgRecentWinRate: number;
  avgHS: number;
  avgMapWinRate: number | null;
}

export function calculateWinProbability(team1: TeamData, team2: TeamData): { team1: number; team2: number } {
  const hasMapData = team1.avgMapWinRate !== null && team2.avgMapWinRate !== null;
  const hasRecentData = team1.avgRecentWinRate > 0 && team2.avgRecentWinRate > 0;
  
  const weights = {
    elo: 0.30,
    winRate: 0.20,
    kdRatio: 0.15,
    recentForm: hasRecentData ? 0.15 : 0,
    mapWinRate: hasMapData ? 0.10 : 0,
    headshotPct: 0.05,
    skillLevel: hasRecentData || hasMapData ? 0.05 : 0.20,
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach(k => weights[k as keyof typeof weights] /= totalWeight);

  function normalizeValue(val: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  }

  function getTeamScore(team: TeamData): number {
    let score = 0;
    score += normalizeValue(team.avgElo, 500, 4000) * weights.elo;
    score += normalizeValue(team.avgWinRate, 30, 70) * weights.winRate;
    score += normalizeValue(team.avgKD, 0.5, 2.0) * weights.kdRatio;
    score += normalizeValue(team.avgRecentWinRate, 0, 100) * weights.recentForm;
    score += normalizeValue(team.avgHS, 30, 70) * weights.headshotPct;
    score += normalizeValue(team.avgSkillLevel, 1, 10) * weights.skillLevel;
    if (hasMapData && team.avgMapWinRate !== null) {
      score += normalizeValue(team.avgMapWinRate, 30, 70) * weights.mapWinRate;
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

export function buildTeamData(players: PlayerProfile[], teamName: string, mapName?: string | null): TeamData {
  const validPlayers = players.filter(p => p !== null);
  
  const avg = (arr: (number | null | undefined)[], fallback: number) => {
    const valid = arr.filter((v): v is number => v !== null && v !== undefined);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : fallback;
  };

  let avgMapWinRate: number | null = null;
  if (mapName) {
    const normalizedMap = mapName.replace("de_", "").replace("cs_", "").toLowerCase();
    const mapWinRates: number[] = [];
    
    for (const player of validPlayers) {
      const mapStats = player.topMaps.find(m => m.mapName.toLowerCase() === normalizedMap);
      if (mapStats && mapStats.matches >= 3) {
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
    avgElo: avg(validPlayers.map(p => p.elo), 1500),
    avgSkillLevel: avg(validPlayers.map(p => p.skillLevel), 5),
    avgKD: avg(validPlayers.map(p => p.kdRatio), 1.0),
    avgWinRate: avg(validPlayers.map(p => p.winRate), 50),
    avgRecentWinRate: avg(validPlayers.map(p => p.recentWinRate), 50),
    avgHS: avg(validPlayers.map(p => p.headshotPct), 50),
    avgMapWinRate,
  };
}
