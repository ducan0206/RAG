import { useState } from "react";
import { Outlet } from "react-router";
import AppSidebar from "./AppSidebar";

const MainLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background font-['Inter']">
            <AppSidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(prev => !prev)} />
            <main className="flex-1 relative overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}

export default MainLayout