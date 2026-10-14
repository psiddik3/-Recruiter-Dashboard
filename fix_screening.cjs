const fs = require('fs');
let content = fs.readFileSync('src/components/CandidateApplyView.tsx', 'utf8');

const importTarget = `const [age, setAge] = useState("");`;
const importReplace = `const [age, setAge] = useState("");\n  const [screeningAnswers, setScreeningAnswers] = useState<Record<number, string>>({});`;

content = content.replace(importTarget, importReplace);

const formTarget = `            {/* Resume Upload Box (Drag and drop) */}`;
const formReplace = `            {selectedJob?.screeningQuestions && selectedJob.screeningQuestions.length > 0 && (
              <div className="space-y-4 py-2">
                <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-2">Screening Questions</h3>
                {selectedJob.screeningQuestions.map((question, idx) => (
                  <div key={idx}>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{question}</label>
                    <textarea 
                      required
                      value={screeningAnswers[idx] || ""}
                      onChange={(e) => setScreeningAnswers({...screeningAnswers, [idx]: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 min-h-[60px]"
                    />
                  </div>
                ))}
              </div>
            )}
            {/* Resume Upload Box (Drag and drop) */}`;

content = content.replace(formTarget, formReplace);

const handleSubmitTarget = `ats: { score: 0, matchedSkills: [], missingSkills: [], experienceMatch: "", educationMatch: "", recommendation: "" }
        }, selectedJob);`;

const handleSubmitReplace = `screeningAnswers: selectedJob.screeningQuestions ? selectedJob.screeningQuestions.map((q, idx) => ({ question: q, answer: screeningAnswers[idx] || "" })) : [],
          ats: { score: 0, matchedSkills: [], missingSkills: [], experienceMatch: "", educationMatch: "", recommendation: "" }
        }, selectedJob);`;

content = content.replace(handleSubmitTarget, handleSubmitReplace);

const newCandTarget = `ats: {
        score,
        matchedSkills,
        missingSkills,
        experienceMatch,
        educationMatch,
        recommendation: rec
      }`;

const newCandReplace = `screeningAnswers: selectedJob.screeningQuestions ? selectedJob.screeningQuestions.map((q, idx) => ({ question: q, answer: screeningAnswers[idx] || "" })) : [],
      ats: {
        score,
        matchedSkills,
        missingSkills,
        experienceMatch,
        educationMatch,
        recommendation: rec
      }`;

content = content.replace(newCandTarget, newCandReplace);

fs.writeFileSync('src/components/CandidateApplyView.tsx', content, 'utf8');
