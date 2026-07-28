import { Job, Candidate, EmailTemplate } from "./types";

export const INITIAL_JOBS: Job[] = [];

export const INITIAL_CANDIDATES: Candidate[] = [];

export const INITIAL_TEMPLATES: EmailTemplate[] = [
  {
    id: 1,
    name: "Interview Invitation",
    subject: "Interview Invitation for {{job_title}} at {{company_name}}",
    body: `Hi {{candidate_name}},
 
Thank you for your application for the {{job_title}} role at {{company_name}}! We were highly impressed by your experience and would love to invite you for a virtual interview with our engineering team.
 
📅 Date: {{interview_date}}
⏰ Time: {{interview_time}}
📍 Location: {{interview_location}}
 
Please ensure you have a stable internet connection and have a copy of your resume ready.
 
We look forward to speaking with you!
 
Best regards,
{{recruiter_name}}
{{company_name}}`
  },
  {
    id: 2,
    name: "Shortlist Confirmation",
    subject: "Application Update: {{job_title}} with {{company_name}}",
    body: `Hi {{candidate_name}},
 
Great news! We have successfully reviewed your application for the {{job_title}} opening.
 
Your profile has been shortlisted by our hiring managers. We will follow up shortly to schedule a primary phone assessment. No action is required on your part at this time.
 
Thank you for your enthusiasm to join our team!
 
Warmly,
{{recruiter_name}}
{{company_name}}`
  },
  {
    id: 3,
    name: "Polite Rejection (Talent Pool Keep)",
    subject: "Your application for {{job_title}} at {{company_name}}",
    body: `Hi {{candidate_name}},
 
Thank you so much for taking the time to apply and speak with us about the {{job_title}} role.
 
While we were very impressed with your background, we have decided to move forward with other candidates whose profiles more closely match our immediate requirements.
 
But we think your skills are exceptional! With your permission, we would love to keep your profile in our persistent Talent Pool database, so we can reach out directly as soon as another relevant position opens up.
 
We wish you the absolute best in your career search!
 
Sincerely,
{{recruiter_name}}
{{company_name}}`
  }
];
