import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Trophy, User, MessageSquare, LogIn } from "lucide-react";
import { isAuthenticated } from "../../services/auth";

export const BottomNav = () => {
  const location = useLocation();
  const authenticated = isAuthenticated();

  const navItems = authenticated
    ? [
        { path: "/dashboard", icon: Home, label: "Home" },
        { path: "/feed", icon: MessageSquare, label: "Feed" },
        { path: "/courses", icon: BookOpen, label: "Courses" },
        { path: "/leaderboard", icon: Trophy, label: "Leaderboard" },
        { path: "/profile", icon: User, label: "Profile" },
      ]
    : [
        { path: "/", icon: Home, label: "Home" },
        { path: "/feed", icon: MessageSquare, label: "Feed" },
        { path: "/courses", icon: BookOpen, label: "Courses" },
        { path: "/auth/login", icon: LogIn, label: "Log In" },
      ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg safe-area-inset-bottom">
      <div className="flex w-full max-w-full overflow-hidden">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center py-2 px-0.5 sm:py-3 sm:px-1 transition-colors flex-1 min-w-0 ${
              isActive(item.path)
                ? "text-azure-500"
                : "text-gray-500 dark:text-gray-400 hover:text-azure-500"
            }`}
          >
            <item.icon
              className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 flex-shrink-0 ${
                isActive(item.path) ? "fill-current" : ""
              }`}
            />
            <span className="text-[10px] sm:text-xs font-medium truncate w-full text-center px-0.5">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
