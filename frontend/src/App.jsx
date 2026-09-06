import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import NewAssessment from "./pages/NewAssessment";
import AssessmentResult from "./pages/AssessmentResult";
import Optimizer from "./pages/Optimizer";
import ClimateMap from "./pages/ClimateMap";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assessment" element={<NewAssessment />} />
        <Route path="/assessment/result" element={<AssessmentResult />} />
        <Route path="/optimizer" element={<Optimizer />} />
        <Route path="/climate-map" element={<ClimateMap />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
