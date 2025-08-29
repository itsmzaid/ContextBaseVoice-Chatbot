import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import LogsPage from "../components/LogsPage.jsx";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/logs" element={<LogsPage />} />
      {/* Add more routes here as needed */}
    </Routes>
  );
};

export default AppRoutes;
