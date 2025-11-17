import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Mail, Lock, AlertCircle, Phone } from "lucide-react";

export const Login = () => {
  const { login, isLoading, error } = useAuth();
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (loginMethod === "email" && !email) {
      setLocalError("Please enter your email");
      return;
    }
    if (loginMethod === "phone" && !phone) {
      setLocalError("Please enter your phone number");
      return;
    }
    if (!password) {
      setLocalError("Please enter your password");
      return;
    }

    login({
      [loginMethod]: loginMethod === "email" ? email : phone,
      password,
    });
  };

  const errorMessage = error instanceof Error ? error.message : localError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-azure-500 to-blue-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">EL</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Welcome Back
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
          Sign in to continue your learning journey
        </p>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Login Method Toggle */}
        <div className="mb-6 flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setLoginMethod("email");
              setLocalError(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMethod === "email"
                ? "bg-white dark:bg-gray-700 text-azure-500 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod("phone");
              setLocalError(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMethod === "phone"
                ? "bg-white dark:bg-gray-700 text-azure-500 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Phone
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email or Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loginMethod === "email" ? "Email" : "Phone Number"}
            </label>
            <div className="relative">
              {loginMethod === "email" ? (
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              ) : (
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              )}
              <input
                type={loginMethod === "email" ? "email" : "tel"}
                value={loginMethod === "email" ? email : phone}
                onChange={(e) =>
                  loginMethod === "email"
                    ? setEmail(e.target.value)
                    : setPhone(e.target.value)
                }
                placeholder={
                  loginMethod === "email"
                    ? "student@example.com"
                    : "+234 901 234 5678"
                }
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azure-500 focus:border-transparent transition-all"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azure-500 focus:border-transparent transition-all"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{" "}
          <Link
            to="/auth/signup"
            className="text-azure-500 hover:text-azure-600 font-semibold"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
