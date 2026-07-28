export interface TimelineEvent {
  event: string;
  date: string;
}

export interface Note {
  text: string;
  author: string;
  date: string;
  reminder?: string;
}

export interface Candidate {
  id: number;
  jobId: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  applied: string;
  stage: "screening" | "shortlist" | "interview" | "offer" | "hired" | "rejected";
  avatar: string;
  avatarUrl?: string;
  resumeText: string;
  experience: string;
  education: string;
  expectedSalary: string;
  noticePeriod: string;
  location: string;
  source: string;
  favourite: boolean;
  notes: Note[];
  timeline: TimelineEvent[];
  rating: number;
  currentCompany?: string;
  resumePDF?: string;
  age?: string;
  screeningAnswers?: Array<{ question: string; answer: string }>;
  sourcedBy?: string;
  recruiterId?: string;
  ats?: {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    experienceMatch: string;
    educationMatch: string;
    recommendation: string;
  };
}

export interface Job {
  id: number;
  firebaseId?: string;
  title: string;
  company: string;
  dept: string;
  employment: "Full-time" | "Part-time" | "Contract" | "Internship";
  location: string;
  salary: string;
  experience: string;
  skills: string[];
  description: string;
  benefits: string;
  deadline: string;
  status: "active" | "pending" | "draft" | "closed";
  postedBy: string;
  recruiterId?: string;
  createdAt: string;
  expiresAt?: string;
  durationDays?: number;
  views: number;
  applications: number;
  conversion: string;
  screeningQuestions?: string[];
  aiLogos?: string[];
  logoUrl?: string;
}

export interface Recruiter {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  designation: string;
  darkMode: boolean;
  language: string;
  companyLogo?: string;
  password?: string;
  showEmailOnApplyForm?: boolean;
  showPhoneOnApplyForm?: boolean;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
}

export type ViewType = "dashboard" | "jobs" | "ats-workspace" | "sharekit" | "talentpool" | "candidate-portal" | "settings" | "founder-console" | "central-pool" | "public-home";
