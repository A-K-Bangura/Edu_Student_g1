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

export interface OnboardingData {
  firstname: string;
  lastname: string;
  phone: string;
  university_id: number | null;
  faculty_id: number | null;
  department_id: number | null;
  level: string;
  role: "student";
}

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
