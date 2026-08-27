import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { EnrollPage, GatePage } from "./pages/Gate";
import { RecordDetailPage } from "./pages/RecordDetail";
import { RecordFormPage } from "./pages/RecordForm";
import { UsersPage } from "./pages/Users";
import { VaultPage } from "./pages/Vault";
import { SessionProvider, useSession } from "./session";
import { ToastHost, useToast } from "./ui";

function Shell() {
  const { code, user, error } = useSession();
  const toast = useToast();

  if (code === "loading") {
    return (
      <main className="grid min-h-[100dvh] place-items-center text-muted">
        载入中
      </main>
    );
  }
  if (error) {
    return <GatePage title="无法连接" body={error} />;
  }
  if (code === "not_provisioned") {
    return <GatePage title="账号未开通" body="请联系管理员把你的 Access 邮箱加入 Fidelius。" />;
  }
  if (code === "disabled") {
    return <GatePage title="账号已停用" body="如需恢复访问，请联系管理员。" />;
  }
  if (user?.status === "pending_enroll") {
    return <EnrollPage />;
  }

  return (
    <AppShell onToast={toast}>
      <Routes>
        <Route path="/" element={<VaultPage />} />
        <Route path="/new" element={<RecordFormPage />} />
        <Route path="/records/:id" element={<RecordDetailPage />} />
        <Route path="/records/:id/edit" element={<RecordFormPage />} />
        <Route path="/users" element={user?.role === "admin" ? <UsersPage /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <SessionProvider>
      <ToastHost>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </ToastHost>
    </SessionProvider>
  );
}
