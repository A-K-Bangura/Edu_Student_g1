import api from "./api";
import type { ApiResponse } from "../types";
import type {
  University,
  Faculty,
  Department,
  Organization,
  OnboardingData,
  AcademicLevel,
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

/** Draft payload allows unset level while Partial<OnboardingData> does not */
export type OnboardingDraftPayload = Omit<Partial<OnboardingData>, "level"> & {
  level?: AcademicLevel | "";
};

// Auto-save draft to localStorage
export const saveDraft = (data: OnboardingDraftPayload): void => {
  localStorage.setItem("onboarding_draft", JSON.stringify(data));
};

// Get saved draft from localStorage
export const getDraft = (): OnboardingDraftPayload | null => {
  const draft = localStorage.getItem("onboarding_draft");
  return draft ? JSON.parse(draft) : null;
};

// Clear draft from localStorage
export const clearDraft = (): void => {
  localStorage.removeItem("onboarding_draft");
};
