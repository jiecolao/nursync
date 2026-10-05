// RootLayout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/SideBar";

export default function MainLayout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar /> {/* Stays mounted across all sub-route navigations */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        <Outlet /> {/* Only this changes when the route updates */}
      </main>
    </div>
  );
}