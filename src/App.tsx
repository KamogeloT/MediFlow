import { Suspense } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import LandingPage from "./components/landing/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useAuth } from "./lib/auth";
import routes from "tempo-routes";

function DashboardRedirect() {
  const { user } = useAuth();
  const role = (user?.user_metadata as { role?: string } | undefined)?.role;
  if (role === "front-desk") return <Navigate to="/front-desk" replace />;
  return <Navigate to="/doctor" replace />;
}

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <Home role="doctor" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/front-desk"
            element={
              <ProtectedRoute roles={["front-desk"]}>
                <Home role="front-desk" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;
