import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/Dashboard";
import { EnrollPage, GatePage, SessionLoading } from "./pages/Gate";
import { RecordDetailPage } from "./pages/RecordDetail";
import { RecordFormPage } from "./pages/RecordForm";
import { UsersPage } from "./pages/Users";
import { VaultPage } from "./pages/Vault";
import { SessionProvider, useSession } from "./session";
import { ToastHost } from "./ui";

function UsersGate() {
  const { user } = useSession();
  return user?.role === "admin" ? <UsersPage /> : <Navigate to="/" replace />;
}

function Shell() {
  const { code, user, error } = useSession();

  if (code === "loading") {
    return <SessionLoading />;
  }
  if (error) {
    return <GatePage title="无法连接" body={error} />;
  }
  if (code === "not_provisioned") {
    return <GatePage title="账号尚未开通" body="请联系管理员将你的 Access 邮箱加入 Fidelius。" />;
  }
  if (code === "disabled") {
    return <GatePage title="账号已停用" body="如需恢复访问，请联系管理员。" />;
  }
  if (user?.status === "pending_enroll") {
    return <EnrollPage />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function Root() {
  return (
    <SessionProvider>
      <ToastHost>
        <Shell />
      </ToastHost>
    </SessionProvider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "vault", element: <VaultPage /> },
      { path: "new", element: <RecordFormPage /> },
      { path: "records/:id", element: <RecordDetailPage /> },
      { path: "records/:id/edit", element: <RecordFormPage /> },
      { path: "users", element: <UsersGate /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
