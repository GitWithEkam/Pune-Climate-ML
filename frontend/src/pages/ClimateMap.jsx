import { useState } from "react";
import { Layers, MapPin, Search, Thermometer, Droplets, Trees, Building2, Info } from "lucide-react";

const layers = [
  {id:"heat",label:"Heat risk",icon:Thermometer},
  {id:"flood",label:"Flood risk",icon:Droplets},
  {id:"vegetation",label:"Vegetation",icon:Trees},
  {id:"impervious",label:"Impervious surface",icon:Building2}
];

export default function ClimateMap() {
  const [active, setActive] = useState("heat");
  return (
    <div className="page">
      <div className="page-heading map-heading"><div><div className="eyebrow">GEOSPATIAL INTELLIGENCE</div><h1>Pune climate risk map</h1><p>Explore spatial patterns and identify priority areas for intervention.</p></div><div className="search-field compact"><Search size={16}/><input placeholder="Search area..."/></div></div>

      <div className="map-layout">
        <section className="map-stage">
          <div className="map-grid"></div>
          <div className="road r1"></div><div className="road r2"></div><div className="road r3"></div><div className="road r4"></div>
          <div className="district d1"></div><div className="district d2"></div><div className="district d3"></div><div className="district d4"></div>
          <div className={`heat-blob b1 ${active}`}></div><div className={`heat-blob b2 ${active}`}></div><div className={`heat-blob b3 ${active}`}></div>
          <div className="project-pin pin1"><MapPin size={18}/></div><div className="project-pin pin2"><MapPin size={18}/></div><div className="project-pin pin3"><MapPin size={18}/></div>
          <div className="map-label label1">Baner</div><div className="map-label label2">Hinjewadi</div><div className="map-label label3">Kharadi</div>
          <div className="map-scale">2 km</div>
          <div className="map-attribution">Pune · Urban climate intelligence preview</div>
        </section>

        <aside className="map-sidebar panel">
          <div className="map-sidebar-title"><Layers size={17}/><strong>Map layers</strong></div>
          <div className="layer-list">
            {layers.map(({id,label,icon:Icon})=><button key={id} className={`layer-item ${active===id?"selected":""}`} onClick={()=>setActive(id)}><Icon size={17}/><span>{label}</span><i></i></button>)}
          </div>
          <div className="map-insight"><div className="insight-icon"><Info size={16}/></div><div><strong>Priority area detected</strong><p>Baner shows elevated heat pressure and low vegetation coverage.</p></div></div>
          <div className="map-legend-panel"><span><i className="risk-high"></i> High</span><span><i className="risk-medium"></i> Moderate</span><span><i className="risk-low"></i> Low</span></div>
        </aside>
      </div>
    </div>
  );
}
