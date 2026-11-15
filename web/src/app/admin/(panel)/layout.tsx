import { Suspense } from "react";
import { AdminPanel } from "@/components/admin/session";

/** Every screen in this folder needs a login. The login page sits outside it. */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense>
      <AdminPanel>{children}</AdminPanel>
    </Suspense>
  );
}
