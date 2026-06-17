import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/forms/app-sidebar";
import { UserMenu } from "~/components/forms/user-menu";
import { ThemeToggle } from "~/components/theme-toggle";

export default function FormsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <main className="w-full">
        <div className="flex items-center justify-between h-10 px-3 border-b">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
}