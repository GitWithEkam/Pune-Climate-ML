import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, Activity, MapPin, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { assessment, recentAssessments, chartData } from "../data/mockData";
import StatCard from "../components/StatCard";
import RiskCard from "../components/RiskCard";
import ClimateGauge from "../components/ClimateGauge";
import SectionHeader from "../components/SectionHeader";

export default function Dashboard() {
  return (
    <div className="page">
      <div className="hero-row">
        <div>
          <div className="eyebrow">SATURDAY · 05 SEPTEMBER 2026</div>
          <h1>Climate intelligence, <span>made actionable.</span></h1>
          <p className="hero-copy">Monitor urban climate impact, evaluate development proposals, and discover data-backed interventions.</p>
        </div>
        <Link to="/assessment" className="primary-btn"><Plus size={18}/> New assessment</Link>
      </div>

      <div className="stats-grid">
        <StatCard label="Active projects" value="12" sub="Across Pune" icon={<Activity size={18}/>} />
        <StatCard label="Average impact score" value="68" sub="Last 30 days" icon={<ShieldAlert size={18}/>} trend="+4.2%" />
        <StatCard label="High-risk sites" value="03" sub="Require attention" icon={<MapPin size={18}/>} />
        <StatCard label="Optimized projects" value="07" sub="Interventions applied" icon={<Sparkles size={18}/>} trend="+2 this week" />
      </div>

      <div className="dashboard-grid">
        <section className="panel score-panel">
          <SectionHeader eyebrow="CURRENT PORTFOLIO" title="Climate impact overview" action={<Link to="/assessment/result" className="text-btn">View assessment <ArrowUpRight size={15}/></Link>} />
          <div className="score-content">
            <ClimateGauge score={assessment.climateScore} label={assessment.status.toUpperCase()} />
            <div className="score-explain">
              <div className="score-title">Portfolio climate impact</div>
              <p>Current sites show elevated heat and carbon pressure, primarily driven by impervious surface and low vegetation coverage.</p>
              <div className="mini-metrics">
                <div><span>Heat</span><b>{assessment.heatRisk}</b></div>
                <div><span>Flood</span><b>{assessment.floodRisk}</b></div>
                <div><span>Carbon</span><b>{assessment.carbonImpact}</b></div>
              </div>
              <Link to="/optimizer" className="secondary-btn">Explore improvements <ArrowRight size={16}/></Link>
            </div>
          </div>
        </section>

        <section className="panel trend-panel">
          <SectionHeader eyebrow="TREND" title="Impact score trajectory" action={<span className="trend-positive">↑ 11 pts</span>} />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(77, 214, 151, .32)"/><stop offset="100%" stopColor="rgba(77, 214, 151, 0)"/></linearGradient></defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#74827d",fontSize:11}} />
                <YAxis hide domain={[40,80]} />
                <Tooltip contentStyle={{background:"#10201b",border:"1px solid #243d35",borderRadius:10,color:"#fff"}} />
                <Area type="monotone" dataKey="score" stroke="#56d89d" strokeWidth={2.5} fill="url(#scoreFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <SectionHeader eyebrow="RISK PROFILE" title="Environmental risk" />
          <div className="risk-list">
            <RiskCard type="heat" label="Urban heat" score={assessment.heatRisk} status="HIGH" />
            <RiskCard type="flood" label="Flood & drainage" score={assessment.floodRisk} status="MODERATE" />
            <RiskCard type="carbon" label="Carbon impact" score={assessment.carbonImpact} status="HIGH" />
            <RiskCard type="green" label="Green cover" score={assessment.greenCoverScore} status="MODERATE" />
          </div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="RECENT" title="Assessments" action={<Link to="/assessment" className="text-btn">New <Plus size={14}/></Link>} />
          <div className="assessment-list">
            {recentAssessments.map((item) => (
              <Link to="/assessment/result" className="assessment-row" key={item.name}>
                <div className="location-dot"><MapPin size={15}/></div>
                <div className="assessment-info"><strong>{item.name}</strong><span>{item.location} · {item.date}</span></div>
                <div className={`score-pill ${item.risk.toLowerCase()}`}>{item.score}</div>
                <ArrowUpRight size={15} className="muted"/>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
