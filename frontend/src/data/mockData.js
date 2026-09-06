export const assessment = {
  projectName: "Baner Urban Development",
  location: "Baner, Pune",
  projectType: "Mixed-use development",
  climateScore: 68,
  status: "Moderate–High",
  heatRisk: 78,
  floodRisk: 62,
  carbonImpact: 71,
  greenCoverScore: 42,
  vegetation: 24.8,
  impervious: 61.3,
  water: 4.2,
  lst: 34.7,
  ndvi: 0.31,
  ndbi: 0.62,
  ndwi: 0.08,
  elevation: 562,
  slope: 3.8
};

export const optimized = {
  climateScore: 81,
  heatRisk: 61,
  floodRisk: 45,
  carbonImpact: 59,
  greenCover: 36.2
};

export const recentAssessments = [
  { name: "Baner Urban Development", location: "Baner", score: 72, risk: "High", date: "Today" },
  { name: "Hinjewadi Mixed-use Project", location: "Hinjewadi", score: 54, risk: "Moderate", date: "Yesterday" },
  { name: "Kharadi Transit Hub", location: "Kharadi", score: 47, risk: "Moderate", date: "02 Sep" },
  { name: "Wakad Green Township", location: "Wakad", score: 38, risk: "Low", date: "31 Aug" }
];

export const recommendations = [
  {
    icon: "tree",
    title: "Increase Tree Canopy",
    description: "Increase vegetation coverage around buildings and pedestrian corridors.",
    current: "24.8%",
    proposed: "35%",
    impact: "+7",
    target: "Heat risk"
  },
  {
    icon: "droplets",
    title: "Introduce Permeable Surfaces",
    description: "Replace selected impervious surfaces with permeable paving to reduce runoff.",
    current: "61.3%",
    proposed: "53%",
    impact: "+5",
    target: "Flood risk"
  },
  {
    icon: "sun",
    title: "Adopt Cool Roofs",
    description: "Use high-reflectance roof materials to reduce surface heat accumulation.",
    current: "Baseline",
    proposed: "Cool roof",
    impact: "+4",
    target: "Heat risk"
  },
  {
    icon: "leaf",
    title: "Expand Green Infrastructure",
    description: "Connect green pockets with shaded corridors and planted open spaces.",
    current: "Low",
    proposed: "Medium",
    impact: "+6",
    target: "Carbon + heat"
  }
];

export const chartData = [
  { month: "Apr", score: 61 },
  { month: "May", score: 64 },
  { month: "Jun", score: 59 },
  { month: "Jul", score: 66 },
  { month: "Aug", score: 68 },
  { month: "Sep", score: 72 }
];
