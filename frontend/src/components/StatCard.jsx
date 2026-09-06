export default function StatCard({ label, value, sub, icon, trend, className = "" }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon">{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{trend && <span className="trend">{trend}</span>}{sub}</div>
    </div>
  );
}
