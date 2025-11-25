import type { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";

interface PageShellProps {
  children: ReactNode;
  showBottomNav?: boolean;
  showTopNav?: boolean;
}

export const PageShell = ({
  children,
  showBottomNav = true,
  showTopNav = true,
}: PageShellProps) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors w-full max-w-full overflow-x-hidden">
      {showTopNav && <TopNav />}
      <main className="pb-20 md:pb-4 w-full max-w-full overflow-x-hidden">
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};
