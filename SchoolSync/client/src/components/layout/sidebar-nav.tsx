import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  User,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: Calendar,
  },
  {
    title: "Materials",
    href: "/materials",
    icon: FileText,
  },
  {
    title: "Courses",
    href: "/courses",
    icon: BookOpen,
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
];

export default function SidebarNav() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  return (
    <div className="w-64 border-r bg-sidebar min-h-screen p-4">
      <div className="space-y-4">
        <div className="py-2">
          <h2 className="text-lg font-semibold text-sidebar-foreground mb-2">School MS</h2>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex items-center py-2 px-3 text-sm font-medium rounded-md",
                  location === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.title}
              </a>
            </Link>
          ))}
        </nav>

        <div className="pt-4 mt-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
