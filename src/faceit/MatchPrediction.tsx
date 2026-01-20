import React, { useEffect, useState } from "react";
import { fetchLeetifyProfile, LeetifyProfile, buildTeamData, calculateWinProbability, TeamData } from "./leetifyApi";

interface Props {
  team1Players: { nickname: string; steamId: string }[];
  team2Players: { nickname: string; steamId: string }[];
  team1Name: string;
  team2Name: string;
  mapName?: string | null;
}

function TeamStatsCard({ team, probability, isWinner }: { team: TeamData; probability: number; isWinner: boolean }) {
  const barColor = isWinner ? "#22c55e" : "#ef4444";
  const neutralColor = "#737373";
  const displayColor = probability >= 48 && probability <= 52 ? neutralColor : barColor;

  return (
    <div style={{
      flex: 1,
      padding: "12px",
      background: isWinner ? "rgba(34, 197, 94, 0.1)" : "transparent",
      borderRadius: "8px",
      border: isWinner ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255,255,255,0.1)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ color: "#d4d4d4", fontSize: "13px", fontWeight: "600" }}>{team.name}</span>
        <span style={{ 
          color: displayColor, 
          fontSize: "20px", 
          fontWeight: "800",
        }}>
          {probability}%
        </span>
      </div>
      
      <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginBottom: "12px", overflow: "hidden" }}>
        <div style={{ 
          height: "100%", 
          width: `${probability}%`, 
          background: displayColor,
          borderRadius: "2px",
          transition: "width 0.5s ease-out",
        }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "10px" }}>
        <div>
          <span style={{ color: "#737373" }}>Avg Leetify</span>
          <p style={{ color: "white", fontWeight: "600", margin: "2px 0 0 0" }}>
            {team.avgLeetifyRating >= 0 ? "+" : ""}{team.avgLeetifyRating.toFixed(2)}
          </p>
        </div>
        <div>
          <span style={{ color: "#737373" }}>Avg Premier</span>
          <p style={{ color: "white", fontWeight: "600", margin: "2px 0 0 0" }}>
            {team.avgPremierRank > 0 ? Math.round(team.avgPremierRank).toLocaleString() : "N/A"}
          </p>
        </div>
        <div>
          <span style={{ color: "#737373" }}>Avg FACEIT ELO</span>
          <p style={{ color: "white", fontWeight: "600", margin: "2px 0 0 0" }}>
            {team.avgFaceitElo > 0 ? Math.round(team.avgFaceitElo).toLocaleString() : "N/A"}
          </p>
        </div>
        <div>
          <span style={{ color: "#737373" }}>{team.avgMapWinRate !== null ? "Map Win Rate" : "Avg Win Rate"}</span>
          <p style={{ color: "white", fontWeight: "600", margin: "2px 0 0 0" }}>
            {team.avgMapWinRate !== null ? Math.round(team.avgMapWinRate) : Math.round(team.avgWinRate)}%
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MatchPrediction({ team1Players, team2Players, team1Name, team2Name, mapName }: Props) {
  const [team1Data, setTeam1Data] = useState<TeamData | null>(null);
  const [team2Data, setTeam2Data] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [probability, setProbability] = useState<{ team1: number; team2: number } | null>(null);

  useEffect(() => {
    async function loadTeams() {
      setLoading(true);
      
      const [t1Profiles, t2Profiles] = await Promise.all([
        Promise.all(team1Players.map(p => fetchLeetifyProfile(p.steamId))),
        Promise.all(team2Players.map(p => fetchLeetifyProfile(p.steamId))),
      ]);

      const validT1 = t1Profiles.filter((p): p is LeetifyProfile => p !== null);
      const validT2 = t2Profiles.filter((p): p is LeetifyProfile => p !== null);

      if (validT1.length === 0 && validT2.length === 0) {
        setLoading(false);
        return;
      }

      const t1Data = buildTeamData(validT1, team1Name, mapName);
      const t2Data = buildTeamData(validT2, team2Name, mapName);
      
      setTeam1Data(t1Data);
      setTeam2Data(t2Data);
      setProbability(calculateWinProbability(t1Data, t2Data));
      setLoading(false);
    }

    if (team1Players.length > 0 && team2Players.length > 0) {
      loadTeams();
    }
  }, [team1Players, team2Players, team1Name, team2Name, mapName]);

  if (loading) {
    return (
      <div style={{
        background: "#141414",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            width: "12px",
            height: "12px",
            border: "2px solid #667eea",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "leetify-spin 0.6s linear infinite",
          }} />
          <span style={{ color: "#737373", fontSize: "12px" }}>Calculating match prediction...</span>
        </div>
        <style>{`@keyframes leetify-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!team1Data || !team2Data || !probability) {
    return null;
  }

  const team1Wins = probability.team1 > probability.team2;
  const team2Wins = probability.team2 > probability.team1;

  return (
    <div style={{
      background: "#141414",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "16px",
      border: "1px solid rgba(255,255,255,0.1)",
      fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>🔮</span>
          <span style={{ color: "white", fontSize: "14px", fontWeight: "700" }}>Match Prediction</span>
        </div>
        <span style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          fontSize: "9px",
          padding: "3px 8px",
          borderRadius: "4px",
          fontWeight: "600",
        }}>
          POWERED BY LEETIFY DATA
        </span>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
        <TeamStatsCard team={team1Data} probability={probability.team1} isWinner={team1Wins} />
        <div style={{ display: "flex", alignItems: "center", color: "#525252", fontSize: "12px", fontWeight: "700" }}>VS</div>
        <TeamStatsCard team={team2Data} probability={probability.team2} isWinner={team2Wins} />
      </div>

      <div style={{ 
        background: "rgba(255,255,255,0.05)", 
        borderRadius: "6px", 
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <span style={{ color: "#f59e0b", fontSize: "12px" }}>⚠️</span>
        <span style={{ color: "#737373", fontSize: "10px" }}>
          Prediction based on Leetify Rating, Premier Rank, FACEIT ELO, Aim stats, {team1Data.avgMapWinRate !== null ? "map-specific" : "overall"} win rates.
          Results may vary based on team synergy and current form.
        </span>
      </div>
    </div>
  );
}
