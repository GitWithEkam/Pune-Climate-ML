import { FileText, Download, Clock3, CheckCircle2, ArrowUpRight, FileBarChart2 } from "lucide-react";

const reports = [
  {name:"Baner Urban Development — Climate Impact Assessment", date:"05 Sep 2026", status:"Ready", score:"68/100"},
  {name:"Hinjewadi Mixed-use Project — Climate Impact Assessment", date:"04 Sep 2026", status:"Ready", score:"54/100"},
  {name:"Kharadi Transit Hub — Climate Impact Assessment", date:"02 Sep 2026", status:"Archived", score:"47/100"}
];

export default function Reports() {
  return (
    <div className="page">
      <div className="hero-row">
        <div><div className="eyebrow">DOCUMENTATION & AUDIT</div><h1>Climate impact reports</h1><p className="hero-copy">Generate, review and archive assessment reports for project approval workflows.</p></div>
        <button className="primary-btn"><FileBarChart2 size={17}/> Generate new report</button>
      </div>

      <div className="report-feature panel">
        <div className="report-icon"><FileText size={25}/></div>
        <div><div className="eyebrow">LATEST ASSESSMENT</div><h2>Baner Urban Development</h2><p>Climate Impact Assessment · 05 September 2026 · Composite score <strong>68/100</strong></p></div>
        <button className="primary-btn"><Download size={16}/> Download PDF</button>
      </div>

      <section className="panel">
        <div className="section-header"><div><div className="eyebrow">REPORT ARCHIVE</div><h2>Assessment documents</h2></div><span className="info-label"><Clock3 size={14}/> Versioned records</span></div>
        <div className="reports-table">
          <div className="table-head"><span>Report</span><span>Date</span><span>Score</span><span>Status</span><span></span></div>
          {reports.map(r=><div className="table-row" key={r.name}><div className="report-name"><div className="small-file"><FileText size={15}/></div><strong>{r.name}</strong></div><span>{r.date}</span><strong>{r.score}</strong><span className={`status ${r.status.toLowerCase()}`}><CheckCircle2 size={13}/>{r.status}</span><button className="icon-btn"><ArrowUpRight size={16}/></button></div>)}
        </div>
      </section>
    </div>
  );
}
