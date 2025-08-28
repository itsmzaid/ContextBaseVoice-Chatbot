import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      {/* Add more routes here as needed */}
    </Routes>
  );
};

export default AppRoutes;
