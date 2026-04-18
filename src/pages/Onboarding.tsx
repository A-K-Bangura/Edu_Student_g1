import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User,
  Phone,
  BookOpen,
  GraduationCap,
  AlertCircle,
  ChevronRight,
  Lock,
} from "lucide-react";
import {
  getUniversities,
  getFaculties,
  getDepartments,
  getOrganizations,
  saveDraft,
  getDraft,
  clearDraft,
} from "../services/onboarding";
import { completeOnboarding } from "../services/auth";
import type {
  OnboardingData,
  OnboardingDraftLevel,
} from "../types/onboarding";
import type { CompleteOnboardingData } from "../services/auth";

const steps = [
  "Personal Info",
  "Academic Level",
  "Academic Details",
  "Account Setup",
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  // Form data
  const [formData, setFormData] = useState<
    Omit<OnboardingData, "level"> & {
      level: OnboardingDraftLevel;
      date_of_birth?: string;
      gender?: "male" | "female" | "other";
      student_id?: string;
      password?: string;
      password_confirmation?: string;
      bio?: string;
    }
  >({
    firstname: "",
    lastname: "",
    phone: "",
    university_id: null,
    faculty_id: null,
    department_id: null,
    organization_id: null,
    level: "",
    role: "student",
    date_of_birth: "",
    gender: undefined,
    student_id: "",
    password: "",
    password_confirmation: "",
    bio: "",
  });

  // Auto-save draft on changes
  useEffect(() => {
    if (Object.values(formData).some((v) => v !== "" && v !== null)) {
      saveDraft(formData);
    }
  }, [formData]);

  // Load draft on mount
  useEffect(() => {
    const draft = getDraft();
    if (draft) {
      setFormData((prev) => ({ ...prev, ...draft }));
    }
  }, []);

  // API queries
  const { data: universities = [] } = useQuery({
    queryKey: ["universities"],
    queryFn: getUniversities,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
  });

  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties", formData.university_id],
    queryFn: () => getFaculties(formData.university_id as number),
    enabled: !!formData.university_id,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", formData.university_id, formData.faculty_id],
    queryFn: () => getDepartments(formData.university_id as number, formData.faculty_id as number),
    enabled: !!formData.university_id && !!formData.faculty_id,
  });

  // Helper to determine if level requires university/faculty/department
  const isRegularLevel = (level: string): boolean => {
    return ["100", "200", "300", "400", "500"].includes(level);
  };

  // Helper to determine if level is UnderGrad or graduate
  const isSpecialLevel = (level: string): boolean => {
    return ["UnderGrad", "graduate"].includes(level);
  };

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (
      data: Omit<OnboardingData, "level"> & {
        level: OnboardingDraftLevel;
        date_of_birth?: string;
        gender?: "male" | "female" | "other";
        student_id?: string;
        password?: string;
        password_confirmation?: string;
        bio?: string;
      }
    ) => {
      if (!data.level) {
        throw new Error("Level is required");
      }
      const level = data.level;
      // Convert to CompleteOnboardingData format
      const onboardingData: CompleteOnboardingData = {
        firstname: data.firstname,
        lastname: data.lastname,
        phone: data.phone,
        level,
        password: data.password || "",
        password_confirmation: data.password_confirmation || "",
      };

      // Add optional fields
      if (data.date_of_birth) onboardingData.date_of_birth = data.date_of_birth;
      if (data.gender) onboardingData.gender = data.gender;
      if (data.bio) onboardingData.bio = data.bio;

      // Add fields based on level type
      if (isRegularLevel(level)) {
        // For levels 100-500: require university, faculty, department, student_id
        onboardingData.university_id = data.university_id as number;
        onboardingData.faculty_id = data.faculty_id as number;
        onboardingData.department_id = data.department_id as number;
        if (data.student_id) onboardingData.student_id = data.student_id;
      } else if (isSpecialLevel(level)) {
        // For UnderGrad/graduate: organization is optional
        if (data.organization_id) {
          onboardingData.organization_id = data.organization_id as number;
        }
      }

      return completeOnboarding(onboardingData);
    },
    onSuccess: () => {
      clearDraft();
      // User is now logged in (token moved from pending to main in completeOnboarding)
      navigate("/dashboard");
    },
  });

  const handleInputChange = (
    field: keyof OnboardingData | string,
    value: string | number | null | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = (): boolean => {
    if (currentStep === 0) {
      // Personal Info validation
      if (!formData.firstname.trim()) return false;
      if (!formData.lastname.trim()) return false;
      if (!formData.phone.trim()) return false;
      // Basic phone validation
      if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, "")))
        return false;
      return true;
    } else if (currentStep === 1) {
      // Level validation
      return !!formData.level;
    } else if (currentStep === 2) {
      // Academic Details validation (conditional based on level)
      if (isRegularLevel(formData.level)) {
        // For levels 100-500: require university, faculty, department
        if (!formData.university_id) return false;
        if (!formData.faculty_id) return false;
        if (!formData.department_id) return false;
        return true;
      } else if (isSpecialLevel(formData.level)) {
        // For UnderGrad/graduate: organization is optional, no validation needed
        return true;
      }
      return false;
    } else if (currentStep === 3) {
      // Account Setup validation
      if (!formData.password || formData.password.length < 8) return false;
      if (formData.password !== formData.password_confirmation) return false;
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    submitMutation.mutate(formData);
  };

  const getValidationMessage = (): string | null => {
    if (currentStep === 0) {
      if (!formData.firstname.trim()) return "First name is required";
      if (!formData.lastname.trim()) return "Last name is required";
      if (!formData.phone.trim()) return "Phone number is required";
      if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ""))) {
        return "Please enter a valid phone number";
      }
    } else if (currentStep === 1) {
      if (!formData.level) return "Please select your level";
    } else if (currentStep === 2) {
      if (isRegularLevel(formData.level)) {
        if (!formData.university_id) return "Please select a university";
        if (!formData.faculty_id) return "Please select a faculty";
        if (!formData.department_id) return "Please select a department";
      }
      // For UnderGrad/graduate, no validation needed (organization is optional)
    } else if (currentStep === 3) {
      if (!formData.password || formData.password.length < 8)
        return "Password must be at least 8 characters";
      if (formData.password !== formData.password_confirmation)
        return "Passwords do not match";
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-azure-500 to-blue-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Help us personalize your learning experience
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex-1 ${index < steps.length - 1 ? "mr-4" : ""}`}
            >
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    index <= currentStep
                      ? "bg-azure-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      index < currentStep
                        ? "bg-azure-500"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
              <p
                className={`text-xs mt-2 text-center ${
                  index <= currentStep
                    ? "text-azure-500 font-semibold"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          {/* Step 1: Personal Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Personal Information
              </h2>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.firstname}
                    onChange={(e) =>
                      handleInputChange("firstname", e.target.value)
                    }
                    placeholder="Enter your first name"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.lastname}
                    onChange={(e) =>
                      handleInputChange("lastname", e.target.value)
                    }
                    placeholder="Enter your last name"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+232 76 123 4567"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Level */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Study Level
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Academic Level *
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.level}
                    onChange={(e) => {
                      handleInputChange("level", e.target.value);
                      // Reset academic fields when level changes
                      handleInputChange("university_id", null);
                      handleInputChange("faculty_id", null);
                      handleInputChange("department_id", null);
                      handleInputChange("organization_id", null);
                      handleInputChange("student_id", "");
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent appearance-none"
                  >
                    <option value="">Select your level</option>
                    <option value="UnderGrad">Undergraduate</option>
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                    <option value="graduate">Graduate</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: University/Organization (conditional based on level) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Academic Information
              </h2>

              {/* For Regular Levels (100-500): Show University/Faculty/Department/Student ID */}
              {isRegularLevel(formData.level) && (
                <>
                  {/* University */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      University *
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={formData.university_id || ""}
                        onChange={(e) => {
                          handleInputChange(
                            "university_id",
                            e.target.value ? Number(e.target.value) : null
                          );
                          // Reset dependent fields
                          handleInputChange("faculty_id", null);
                          handleInputChange("department_id", null);
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent appearance-none"
                      >
                        <option value="">Select a university</option>
                        {universities.map((uni) => (
                          <option key={uni.id} value={uni.id}>
                            {uni.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Faculty */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Faculty *
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={formData.faculty_id || ""}
                        onChange={(e) => {
                          handleInputChange(
                            "faculty_id",
                            e.target.value ? Number(e.target.value) : null
                          );
                          // Reset department
                          handleInputChange("department_id", null);
                        }}
                        disabled={!formData.university_id}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {formData.university_id
                            ? "Select a faculty"
                            : "Select a university first"}
                        </option>
                        {faculties.map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Department *
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={formData.department_id || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "department_id",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        disabled={!formData.faculty_id}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {formData.faculty_id
                            ? "Select a department"
                            : "Select a faculty first"}
                        </option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Student ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Student ID
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.student_id || ""}
                        onChange={(e) =>
                          handleInputChange("student_id", e.target.value)
                        }
                        placeholder="Enter your student ID (optional)"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* For UnderGrad/Graduate Levels: Show Organization (optional) */}
              {isSpecialLevel(formData.level) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organization (Optional)
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.organization_id || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "organization_id",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent appearance-none"
                    >
                      <option value="">
                        Select an organization (optional)
                      </option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    You can optionally associate with an organization
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Account Setup */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Account Setup
              </h2>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password || ""}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password_confirmation || ""}
                    onChange={(e) =>
                      handleInputChange("password_confirmation", e.target.value)
                    }
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Validation Message */}
          {getValidationMessage() && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {getValidationMessage()}
              </p>
            </div>
          )}

          {/* Error Message */}
          {submitMutation.error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {submitMutation.error instanceof Error
                  ? submitMutation.error.message
                  : "An error occurred"}
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!validateStep() || submitMutation.isPending}
              className="px-6 py-2 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              {submitMutation.isPending
                ? "Submitting..."
                : currentStep === steps.length - 1
                ? "Complete"
                : "Next"}{" "}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
