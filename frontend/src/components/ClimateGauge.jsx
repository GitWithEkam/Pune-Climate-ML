export default function ClimateGauge({ score = 68, label = "MODERATE–HIGH" }) {
  const circumference = 2 * Math.PI * 78;
  const progress = circumference * (score / 100);
  return (
    <div className="gauge-wrap">
      <svg className="gauge" viewBox="0 0 190 190">
        <circle cx="95" cy="95" r="78" className="gauge-track" />
        <circle cx="95" cy="95" r="78" className="gauge-progress"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform="rotate(-90 95 95)" />
      </svg>
      <div className="gauge-center">
        <strong>{score}</strong>
        <span>/100</span>
        <small>{label}</small>
      </div>
    </div>
  );
}
