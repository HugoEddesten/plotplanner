import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { theme } from "./theme";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import CreatePlotPage from "./pages/CreatePlotPage";
import ProtectedRoute from "./components/ProtectedRoute";
import PlotPage from "./pages/PlotPage";
import PlotHistoryPage from "./pages/PlotHistoryPage";

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/plots/new", element: <CreatePlotPage /> },
      { path: "/plots/:id", element: <PlotPage /> },
      { path: "/plots/:id/history", element: <PlotHistoryPage /> }
    ],
  },
]);

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
