import React, { useEffect, useState } from "react";
import { fetchPlayerProfile, PlayerProfile, buildTeamData, calculateWinProbability, TeamData } from "./faceitApi";

interface Props {
  team1Players: { nickname: string; oddjobId: string }[];
  team2Players: { nickname: string; oddjobId: string }[];
  team1Name: string;
  team2Name: string;
  mapName?: string | null;
}

function StatRow({ label, team1Value, team2Value, suffix = "", higherIsBetter = true }: { 
  label: string; 
  team1Value: number | string; 
  team2Value: number | string;
  suffix?: string;
  higherIsBetter?: boolean;
}) {
  const v1 = typeof team1Value === 'number' ? team1Value : parseFloat(team1Value) || 0;
  const v2 = typeof team2Value === 'number' ? team2Value : parseFloat(team2Value) || 0;
  
  const team1Better = higherIsBetter ? v1 > v2 : v1 < v2;
  const team2Better = higherIsBetter ? v2 > v1 : v2 < v1;
  const team1Color = team1Better ? "#00ff9d" : "#94a3b8";
  const team2Color = team2Better ? "#00ff9d" : "#94a3b8";

  const formatValue = (v: number | string) => {
    if (typeof v === 'string') return v;
    if (Number.isInteger(v)) return v.toLocaleString();
    return v.toFixed(2);
  };

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "1fr auto 1fr", 
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid rgba(71, 85, 105, 0.3)",
    }}>
      <div style={{ 
        textAlign: "right", 
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: "16px",
        color: team1Color,
        paddingRight: "16px",
      }}>
        {formatValue(team1Value)}{suffix}
      </div>
      <div style={{ 
        fontSize: "10px", 
        color: "#64748b", 
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        fontWeight: 600,
        minWidth: "80px",
        textAlign: "center",
        padding: "0 4px",
      }}>
        {label}
      </div>
      <div style={{ 
        textAlign: "left", 
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: "16px",
        color: team2Color,
        paddingLeft: "16px",
      }}>
        {formatValue(team2Value)}{suffix}
      </div>
    </div>
  );
}

function TeamHeader({ team, probability, isFavorite }: { team: TeamData; probability: number; isFavorite: boolean }) {
  const accentColor = isFavorite ? "#00ff9d" : "#ff5500";
  const label = isFavorite ? "FAVORITE" : "CHALLENGER";
  
  return (
    <div style={{ 
      flex: 1, 
      textAlign: "center",
      padding: "16px 12px",
      minWidth: 0,
      overflow: "hidden",
    }}>
      <div style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "4px",
        background: `${accentColor}20`,
        marginBottom: "8px",
      }}>
        <span style={{ 
          fontSize: "10px", 
          fontWeight: 700, 
          color: accentColor,
          letterSpacing: "0.1em",
        }}>
          {label}
        </span>
      </div>
      <h2 style={{ 
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: "18px",
        color: "#e2e8f0",
        margin: "0 0 8px 0",
        letterSpacing: "0.02em",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {team.name}
      </h2>
      <div style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 900,
        fontSize: "36px",
        color: accentColor,
        textShadow: `0 0 20px ${accentColor}40`,
        lineHeight: 1,
      }}>
        {probability}%
      </div>
      <div style={{
        marginTop: "12px",
        height: "6px",
        background: "#1e293b",
        borderRadius: "3px",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${probability}%`,
          background: `linear-gradient(90deg, ${accentColor}80, ${accentColor})`,
          boxShadow: `0 0 10px ${accentColor}`,
        }} />
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
        Promise.all(team1Players.map(p => fetchPlayerProfile(p.oddjobId))),
        Promise.all(team2Players.map(p => fetchPlayerProfile(p.oddjobId))),
      ]);

      const validT1 = t1Profiles.filter((p): p is PlayerProfile => p !== null);
      const validT2 = t2Profiles.filter((p): p is PlayerProfile => p !== null);

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
        background: "linear-gradient(180deg, #0f1623 0%, #0a0f18 100%)",
        borderRadius: "16px",
        padding: "32px",
        marginBottom: "16px",
        border: "1px solid rgba(148, 163, 184, 0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <span style={{
            width: "20px",
            height: "20px",
            border: "2px solid #ff5500",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "ll-spin 0.6s linear infinite",
          }} />
          <span style={{ color: "#94a3b8", fontSize: "14px" }}>
            Loading match prediction...
          </span>
        </div>
        <style>{`@keyframes ll-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!team1Data || !team2Data || !probability) {
    return null;
  }

  const team1IsFavorite = probability.team1 > probability.team2;
  const team2IsFavorite = probability.team2 > probability.team1;

  return (
    <div style={{
      background: "linear-gradient(180deg, #0f1623 0%, #0a0f18 100%)",
      borderRadius: "16px",
      overflow: "hidden",
      marginBottom: "16px",
      border: "1px solid rgba(148, 163, 184, 0.15)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(15, 22, 35, 0.8)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #ff5500 0%, #ff7700 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}>
            🎮
          </div>
          <div>
            <h1 style={{ 
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "20px",
              color: "white",
              margin: 0,
              letterSpacing: "0.05em",
            }}>
              MATCH PREDICTION
            </h1>
            <p style={{ fontSize: "10px", color: "#64748b", margin: 0, letterSpacing: "0.05em" }}>
              ANALYTICS V2.0 {mapName && `• ${mapName.replace("de_", "").toUpperCase()}`}
            </p>
          </div>
        </div>
        <div style={{
          background: "rgba(71, 85, 105, 0.3)",
          padding: "6px 14px",
          borderRadius: "20px",
          border: "1px solid rgba(71, 85, 105, 0.5)",
        }}>
          <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em" }}>
            ⚡ POWERED BY FACEIT DATA
          </span>
        </div>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
      }}>
        <TeamHeader team={team1Data} probability={probability.team1} isFavorite={team1IsFavorite} />
        <div style={{
          padding: "0 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}>
          <div style={{
            background: "#0c121e",
            border: "2px solid #334155",
            borderRadius: "6px",
            padding: "6px 10px",
          }}>
            <span style={{ 
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 900,
              fontSize: "14px",
              color: "#475569",
              fontStyle: "italic",
            }}>
              VS
            </span>
          </div>
        </div>
        <TeamHeader team={team2Data} probability={probability.team2} isFavorite={team2IsFavorite} />
      </div>

      <div style={{ padding: "16px 32px" }}>
        <div style={{ 
          fontSize: "11px", 
          color: "#475569", 
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 700,
          marginBottom: "8px",
          textAlign: "center",
        }}>
          Team Statistics Comparison
        </div>
        
        <StatRow 
          label="Avg ELO" 
          team1Value={Math.round(team1Data.avgElo)} 
          team2Value={Math.round(team2Data.avgElo)} 
        />
        <StatRow 
          label="Avg K/D" 
          team1Value={team1Data.avgKD} 
          team2Value={team2Data.avgKD} 
        />
        <StatRow 
          label="Win Rate" 
          team1Value={Math.round(team1Data.avgWinRate)} 
          team2Value={Math.round(team2Data.avgWinRate)} 
          suffix="%"
        />
        <StatRow 
          label="HS %" 
          team1Value={Math.round(team1Data.avgHS)} 
          team2Value={Math.round(team2Data.avgHS)} 
          suffix="%"
        />
        <StatRow 
          label="Recent Form" 
          team1Value={Math.round(team1Data.avgRecentWinRate)} 
          team2Value={Math.round(team2Data.avgRecentWinRate)} 
          suffix="%"
        />
        <StatRow 
          label="Skill Level" 
          team1Value={team1Data.avgSkillLevel.toFixed(1)} 
          team2Value={team2Data.avgSkillLevel.toFixed(1)} 
        />
        {team1Data.avgMapWinRate !== null && team2Data.avgMapWinRate !== null && (
          <StatRow 
            label={`${mapName?.replace("de_", "").toUpperCase() || "Map"} WR`}
            team1Value={Math.round(team1Data.avgMapWinRate)} 
            team2Value={Math.round(team2Data.avgMapWinRate)} 
            suffix="%"
          />
        )}
      </div>

      <div style={{ padding: "0 24px 20px 24px" }}>
        <div style={{
          background: "rgba(30, 41, 59, 0.4)",
          borderRadius: "8px",
          padding: "12px 16px",
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "14px" }}>⚠️</span>
          <p style={{ 
            fontSize: "11px", 
            color: "#64748b", 
            margin: 0,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: "#94a3b8" }}>Disclaimer:</strong> Prediction uses weighted algorithm based on ELO (30%), Win Rate (20%), K/D (15%), Recent Form (15%), Map WR (10%), HS% (5%), Skill Level (5%). Results may vary.
          </p>
        </div>
      </div>
    </div>
  );
}
