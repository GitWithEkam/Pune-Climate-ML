import PDFDocument from "pdfkit";

export function streamAssessmentReport(res, assessment) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.type("application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="climate-assessment-${assessment.id}.pdf"`);
  doc.pipe(res);
  doc.fontSize(20).fillColor("#155e48").text("Urban Climate Intelligence");
  doc.moveDown(0.3).fontSize(14).fillColor("#111827").text("Climate Impact Assessment");
  doc.moveDown().fontSize(11);
  doc.text(`Project: ${assessment.projectName}`);
  doc.text(`Location: ${assessment.location}`);
  doc.text(`Project type: ${assessment.projectType}`);
  doc.text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown().fontSize(16).text(`Climate score: ${assessment.climateScore}/100`);
  doc.fontSize(11).text(`Impact score: ${assessment.impactScore}/100 (${assessment.status})`);
  doc.text(`Data confidence: ${assessment.dataQuality.confidence} (${assessment.dataQuality.completeness}% complete)`);
  doc.moveDown().fontSize(13).text("Risk breakdown");
  doc.fontSize(11);
  doc.text(`Urban heat: ${assessment.heatRisk}/100`);
  doc.text(`Flood and drainage: ${assessment.floodRisk}/100`);
  doc.text(`Carbon impact: ${assessment.carbonImpact}/100`);
  doc.text(`Green-cover pressure: ${assessment.greenCoverScore}/100`);
  doc.moveDown().fontSize(13).text("Satellite-derived indicators");
  doc.fontSize(11);
  doc.text(`Vegetation: ${assessment.vegetation}%`);
  doc.text(`Impervious surface: ${assessment.impervious}%`);
  doc.text(`Water: ${assessment.water}%`);
  doc.text(`Land surface temperature: ${assessment.lst} C`);
  doc.text(`NDVI / NDBI / NDWI: ${assessment.ndvi} / ${assessment.ndbi} / ${assessment.ndwi}`);
  if (assessment.dataQuality.assumptions.length) {
    doc.moveDown().fontSize(13).text("Assumptions");
    doc.fontSize(10);
    for (const assumption of assessment.dataQuality.assumptions) doc.text(`- ${assumption}`);
  }
  doc.moveDown().fontSize(8).fillColor("#6b7280")
    .text("Decision-support output. Validate model inputs and engineering assumptions before statutory use.");
  doc.end();
}
