import { Link } from "react-router-dom";
import { Home, BookOpen, Trophy, User, MessageSquare } from "lucide-react";
import { useUIStore } from "../../store/uiStore";

export const TopNav = () => {
  const darkMode = useUIStore((state) => state.darkMode);

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Home" },
    { path: "/feed", icon: MessageSquare, label: "Feed" },
    { path: "/courses", icon: BookOpen, label: "Courses" },
    { path: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="hidden md:flex top-0 sticky z-50 bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto w-full px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-azure-500 to-blue-violet-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">EL</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              EduLift Sierra
            </span>
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-azure-500 dark:hover:text-azure-400 transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => useUIStore.getState().toggleDarkMode()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? "🌙" : "☀️"}
          </button>
        </div>
      </div>
    </nav>
  );
};
