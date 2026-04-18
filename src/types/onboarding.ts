export interface University {
  id: number;
  name: string;
}

export interface Faculty {
  id: number;
  name: string;
  university_id: number;
}

export interface Department {
  id: number;
  name: string;
  faculty_id: number;
}

export interface Organization {
  id: number;
  name: string;
}

// Academic level type union
export type AcademicLevel =
  | "UnderGrad"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "graduate";

export interface OnboardingData {
  firstname: string;
  lastname: string;
  phone: string;
  university_id: number | null;
  faculty_id: number | null;
  department_id: number | null;
  organization_id: number | null;
  level: AcademicLevel;
  role: "student";
}

/** Local draft / form state may use "" for level until the user selects one */
export type OnboardingDraftLevel = AcademicLevel | "";

export interface OnboardingResponse {
  user_id: number;
  user: {
    id: number;
    email: string;
    firstname: string;
    lastname: string;
    university: string;
    faculty: string;
    department: string;
    level: string;
  };
}
