import AdminRouteGate from "../../components/AdminRouteGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminRouteGate>{children}</AdminRouteGate>;
}
