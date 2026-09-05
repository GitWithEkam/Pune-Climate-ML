import { Flame, Droplets, Wind, Trees } from "lucide-react";

const icons = { heat: Flame, flood: Droplets, carbon: Wind, green: Trees };

export default function RiskCard({ type, label, score, status }) {
  const Icon = icons[type] || Flame;
  const level = score >= 70 ? "high" : score >= 50 ? "medium" : "low";
  return (
    <div className={`risk-card ${level}`}>
      <div className="risk-icon"><Icon size={19}/></div>
      <div className="risk-main">
        <div className="risk-label">{label}</div>
        <div className="risk-score">{score}<small>/100</small></div>
      </div>
      <div className={`risk-badge ${level}`}>{status}</div>
    </div>
  );
}
