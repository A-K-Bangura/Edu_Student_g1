import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Trophy, User, MessageSquare } from "lucide-react";

export const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Home" },
    { path: "/feed", icon: MessageSquare, label: "Feed" },
    { path: "/courses", icon: BookOpen, label: "Courses" },
    { path: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center py-3 px-6 transition-colors ${
              isActive(item.path)
                ? "text-azure-500"
                : "text-gray-500 dark:text-gray-400 hover:text-azure-500"
            }`}
          >
            <item.icon
              className={`w-6 h-6 mb-1 ${
                isActive(item.path) ? "fill-current" : ""
              }`}
            />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
