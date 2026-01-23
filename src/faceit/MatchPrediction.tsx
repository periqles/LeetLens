import React, { useEffect, useState } from "react";
import { fetchPlayerProfile, PlayerProfile, buildTeamData, calculateWinProbability, TeamData } from "./faceitApi";

interface Props {
  team1Players: { nickname: string; oddjobId: string }[];
  team2Players: { nickname: string; oddjobId: string }[];
  team1Name: string;
  team2Name: string;
  mapName?: string | null;
}

function MiniBarChart({ color, opacity = 0.5 }: { color: string; opacity?: number }) {
  return (
    <div style={{ height: "24px", display: "flex", alignItems: "flex-end", gap: "2px", paddingBottom: "4px", opacity }}>
      <div style={{ width: "4px", height: "40%", background: color, borderRadius: "2px" }} />
      <div style={{ width: "4px", height: "60%", background: color, borderRadius: "2px" }} />
      <div style={{ width: "4px", height: "30%", background: color, borderRadius: "2px" }} />
    </div>
  );
}

function StatProgressBar({ percentage, color }: { percentage: number; color: string }) {
  return (
    <div style={{ height: "4px", width: "48px", background: "#334155", borderRadius: "9999px", marginTop: "8px", position: "relative", overflow: "hidden" }}>
      <div style={{ 
        position: "absolute", 
        left: 0, 
        top: 0, 
        height: "100%", 
        width: `${Math.min(100, Math.max(0, percentage))}%`, 
        background: color,
        boxShadow: `0 0 5px ${color}`,
      }} />
    </div>
  );
}

function TeamCard({ team, probability, isFavorite }: { team: TeamData; probability: number; isFavorite: boolean }) {
  const accentColor = isFavorite ? "#00ff9d" : "#ff2a42";
  const accentColorDim = isFavorite ? "rgba(0, 255, 157, 0.3)" : "rgba(255, 42, 66, 0.3)";
  const textShadow = isFavorite ? "0 0 10px rgba(0, 255, 157, 0.5)" : "0 0 10px rgba(255, 42, 66, 0.5)";
  const label = isFavorite ? "Favorite" : "Challenger";
  const labelColor = isFavorite ? "#00ff9d" : "#ff2a42";
  
  const maxElo = 4000;
  const maxKD = 2.0;
  const eloPct = (team.avgElo / maxElo) * 100;
  const kdPct = (team.avgKD / maxKD) * 100;

  return (
    <div style={{
      flex: 1,
      position: "relative",
      background: "#0c121e",
      borderRadius: "16px",
      border: isFavorite ? `1px solid ${accentColorDim}` : "1px solid rgba(148, 163, 184, 0.2)",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      boxShadow: isFavorite ? `0 0 30px -5px rgba(0, 255, 157, 0.15)` : `0 0 30px -10px rgba(255, 42, 66, 0.1)`,
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "4px",
        background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
        opacity: isFavorite ? 0.8 : 0.6,
      }} />
      
      {isFavorite && (
        <div style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "128px",
          height: "128px",
          opacity: 0.1,
          backgroundImage: `radial-gradient(circle, ${accentColor} 1px, transparent 1px)`,
          backgroundSize: "4px 4px",
        }} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div style={{ textAlign: "left", position: "relative", zIndex: 10 }}>
          <h2 style={{ 
            fontFamily: "'Rajdhani', sans-serif", 
            fontWeight: 700, 
            fontSize: "20px", 
            color: isFavorite ? "#e2e8f0" : "#cbd5e1",
            letterSpacing: "0.05em",
            margin: 0,
          }}>
            {team.name}
          </h2>
          <span style={{ 
            fontSize: "10px", 
            fontFamily: "monospace",
            color: labelColor,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: isFavorite ? 700 : 400,
          }}>
            {label}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ 
            display: "block",
            fontFamily: "'Rajdhani', sans-serif", 
            fontWeight: 900, 
            fontSize: "48px", 
            color: accentColor,
            textShadow,
            lineHeight: 1,
          }}>
            {probability}%
          </span>
        </div>
      </div>

      <div style={{ 
        width: "100%", 
        height: "6px", 
        background: "#1e293b", 
        borderRadius: "9999px", 
        marginBottom: "32px", 
        overflow: "hidden" 
      }}>
        <div style={{ 
          height: "100%", 
          width: `${probability}%`, 
          background: accentColor,
          boxShadow: `0 0 10px ${accentColor}`,
          transition: "width 0.5s ease-out",
        }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, margin: 0 }}>
            Avg FACEIT ELO
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <span style={{ fontSize: "18px", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: "white" }}>
              {team.avgElo > 0 ? Math.round(team.avgElo).toLocaleString() : "N/A"}
            </span>
            <StatProgressBar percentage={eloPct} color={accentColor} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, margin: 0 }}>
            Avg K/D Ratio
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <span style={{ fontSize: "18px", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: "white" }}>
              {team.avgKD.toFixed(2)}
            </span>
            <StatProgressBar percentage={kdPct} color={accentColor} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, margin: 0 }}>
            Avg Win Rate
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <span style={{ fontSize: "18px", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: "white" }}>
              {Math.round(team.avgWinRate)}%
            </span>
            <MiniBarChart color={accentColor} opacity={isFavorite ? 0.8 : 0.5} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, margin: 0 }}>
            {team.avgMapWinRate !== null ? "Map Win Rate" : "Recent Form"}
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <span style={{ fontSize: "18px", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: "white" }}>
              {team.avgMapWinRate !== null ? Math.round(team.avgMapWinRate) : Math.round(team.avgRecentWinRate)}%
            </span>
            <span style={{ 
              fontSize: "14px", 
              color: isFavorite ? "#22c55e" : "#ef4444",
              transform: isFavorite ? "none" : "rotate(180deg)",
            }}>
              ▲
            </span>
          </div>
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
        background: "#0f1623",
        borderRadius: "24px",
        padding: "24px",
        marginBottom: "16px",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{
            width: "16px",
            height: "16px",
            border: "2px solid #ff5500",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "ll-spin 0.6s linear infinite",
          }} />
          <span style={{ color: "#94a3b8", fontSize: "14px", fontFamily: "'Inter', sans-serif" }}>
            Calculating match prediction...
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
      background: "#0f1623",
      borderRadius: "24px",
      overflow: "hidden",
      marginBottom: "16px",
      border: "1px solid rgba(148, 163, 184, 0.2)",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
    }}>
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        opacity: 0.03,
        pointerEvents: "none",
        backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
        backgroundSize: "30px 30px",
      }} />

      <div style={{
        padding: "24px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "256px",
          height: "256px",
          background: "rgba(255, 85, 0, 0.1)",
          borderRadius: "50%",
          filter: "blur(48px)",
          transform: "translate(50%, -50%)",
        }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative", zIndex: 10 }}>
          <div style={{
            padding: "8px",
            borderRadius: "8px",
            background: "rgba(255, 85, 0, 0.1)",
            border: "1px solid rgba(255, 85, 0, 0.3)",
          }}>
            <span style={{ fontSize: "24px" }}>🎮</span>
          </div>
          <div>
            <h1 style={{ 
              fontFamily: "'Rajdhani', sans-serif", 
              fontWeight: 700, 
              fontSize: "24px", 
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "white",
              margin: 0,
            }}>
              Match Prediction
            </h1>
            <p style={{ 
              fontSize: "10px", 
              color: "#94a3b8", 
              fontFamily: "monospace",
              letterSpacing: "0.1em",
              margin: 0,
            }}>
              ANALYTICS V2.0
            </p>
          </div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 51%, #0f172a 100%)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.3)",
          padding: "6px 16px",
          borderRadius: "9999px",
          border: "1px solid #475569",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          position: "relative",
          zIndex: 10,
        }}>
          <span style={{ fontSize: "12px" }}>⚡</span>
          <span style={{ 
            fontSize: "10px", 
            fontWeight: 700, 
            color: "#e2e8f0", 
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: "'Rajdhani', sans-serif",
          }}>
            Powered by FACEIT Data
          </span>
        </div>
      </div>

      <div style={{ padding: "32px 40px", position: "relative" }}>
        <div style={{ display: "flex", gap: "32px", position: "relative" }}>
          <div style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            height: "100%",
            pointerEvents: "none",
          }}>
            <div style={{
              height: "100%",
              width: "1px",
              background: "linear-gradient(to bottom, transparent, #475569, transparent)",
            }} />
            <div style={{
              position: "absolute",
              background: "#050b14",
              border: "2px solid #475569",
              borderRadius: "8px",
              padding: "8px",
            }}>
              <span style={{ 
                fontFamily: "'Rajdhani', sans-serif", 
                fontWeight: 900, 
                fontSize: "18px", 
                color: "#64748b",
                fontStyle: "italic",
                paddingRight: "4px",
              }}>
                VS
              </span>
            </div>
          </div>

          <TeamCard 
            team={team1Data} 
            probability={probability.team1} 
            isFavorite={team1IsFavorite}
          />
          <TeamCard 
            team={team2Data} 
            probability={probability.team2} 
            isFavorite={team2IsFavorite}
          />
        </div>
      </div>

      <div style={{ padding: "0 40px 32px 40px" }}>
        <div style={{
          borderRadius: "12px",
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(71, 85, 105, 0.5)",
          padding: "16px",
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
        }}>
          <div style={{
            padding: "6px",
            borderRadius: "9999px",
            background: "rgba(245, 158, 11, 0.2)",
            color: "#f59e0b",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: "16px" }}>⚠️</span>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
              Prediction Disclaimer
            </span>
            Prediction based on FACEIT ELO, K/D Ratio, Win Rate, Recent Form (last 20 games), and {team1Data.avgMapWinRate !== null ? "map-specific" : "historical"} performance. 
            Results may vary based on team synergy, individual form, and map selection.
          </div>
        </div>
      </div>
    </div>
  );
}
