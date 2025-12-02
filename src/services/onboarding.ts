import api from "./api";
import type { ApiResponse } from "../types";
import type {
  University,
  Faculty,
  Department,
  Organization,
  OnboardingData,
  OnboardingResponse,
} from "../types/onboarding";

// Get all universities
export const getUniversities = async (): Promise<University[]> => {
  const response = await api.get<ApiResponse<University[]>>("/universities");
  return response.data.data || [];
};

// Get all organizations
export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await api.get<ApiResponse<Organization[]>>("/organizations");
  return response.data.data || [];
};

// Get faculties for a university
export const getFaculties = async (
  universityId: number
): Promise<Faculty[]> => {
  const response = await api.get<ApiResponse<Faculty[]>>(
    `/universities/${universityId}/faculties`
  );
  return response.data.data || [];
};

// Get departments for a faculty
export const getDepartments = async (
  universityId: number,
  facultyId: number
): Promise<Department[]> => {
  const response = await api.get<ApiResponse<Department[]>>(
    `/universities/${universityId}/faculties/${facultyId}/departments`
  );
  return response.data.data || [];
};

// Submit onboarding data
export const submitOnboarding = async (
  data: OnboardingData
): Promise<OnboardingResponse> => {
  const response = await api.post<ApiResponse<OnboardingResponse>>(
    "/auth/onboarding",
    data
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Onboarding submission failed");
  }

  // Update user in localStorage
  const currentUser = localStorage.getItem("user");
  if (currentUser) {
    const user = JSON.parse(currentUser);
    user.firstname = response.data.data.user.firstname;
    user.lastname = response.data.data.user.lastname;
    user.university = response.data.data.user.university;
    user.faculty = response.data.data.user.faculty;
    user.department = response.data.data.user.department;
    user.level = response.data.data.user.level;
    localStorage.setItem("user", JSON.stringify(user));
  }

  return response.data.data;
};

// Auto-save draft to localStorage
export const saveDraft = (data: Partial<OnboardingData>): void => {
  localStorage.setItem("onboarding_draft", JSON.stringify(data));
};

// Get saved draft from localStorage
export const getDraft = (): Partial<OnboardingData> | null => {
  const draft = localStorage.getItem("onboarding_draft");
  return draft ? JSON.parse(draft) : null;
};

// Clear draft from localStorage
export const clearDraft = (): void => {
  localStorage.removeItem("onboarding_draft");
};
