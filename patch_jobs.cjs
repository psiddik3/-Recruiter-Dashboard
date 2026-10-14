const fs = require('fs');
let content = fs.readFileSync('src/components/JobsView.tsx', 'utf8');

// 1. Add Edit2 icon
content = content.replace('Clipboard, Loader2', 'Clipboard, Loader2, Edit2');

// 2. Add editingJob state
content = content.replace('const [title, setTitle] = useState("");', 'const [editingJob, setEditingJob] = useState<Job | null>(null);\n  const [title, setTitle] = useState("");');

// 3. Add openEditModal function
const handleAddJobCode = `  const handleStopJob = (jobId: number, e: React.MouseEvent) => {`;
const openEditModalCode = `  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setTitle(job.title);
    setCompany(job.company);
    setDept(job.dept);
    setEmployment(job.employment);
    setLocation(job.location);
    setSalary(job.salary || "");
    setExperience(job.experience || "0 years");
    setSkillsString((job.skills || []).join(", "));
    setDescription(job.description || "");
    setShowModal(true);
  };
  const handleStopJob = (jobId: number, e: React.MouseEvent) => {`;
content = content.replace(handleAddJobCode, openEditModalCode);

// 4. Update the Create New Job Opening header
content = content.replace('Create New Job Opening', '{editingJob ? "Edit Job Opening" : "Create New Job Opening"}');

// 5. Update form submission to handle edit
const handleSubmitRegex = /const handleSubmit = \(e: React\.FormEvent, status: "active" \| "draft"\) => \{([\s\S]*?)const jobObj: Job = \{([\s\S]*?)id: Date\.now\(\),([\s\S]*?)deadline,([\s\S]*?)views: 0,([\s\S]*?)conversion: "0\.0%"([\s\S]*?)\};([\s\S]*?)handleAddJob\(jobObj\);([\s\S]*?)setShowModal\(false\);/;
const replaceWith = `const handleSubmit = (e: React.FormEvent, status: "active" | "draft") => {
    e.preventDefault();
    if (!title || !company) return;

    const skills = skillsString.split(",").map(s => s.trim()).filter(Boolean);

    const jobObj: Job = {
      ...(editingJob || {}),
      id: editingJob ? editingJob.id : Date.now(),
      title,
      company,
      dept,
      employment,
      location,
      salary,
      experience,
      skills,
      description: description.trim(),
      benefits: editingJob ? editingJob.benefits : "Competitive compensation, remote flexibility",
      deadline: editingJob ? editingJob.deadline : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status,
      postedBy: editingJob ? editingJob.postedBy : (recruiterName || "Siddharth"),
      createdAt: editingJob ? editingJob.createdAt : new Date().toISOString(),
      views: editingJob ? editingJob.views : 0,
      applications: editingJob ? editingJob.applications : 0,
      conversion: editingJob ? editingJob.conversion : "0.0%"
    };

    if (editingJob) {
      onUpdateJob && onUpdateJob(jobObj);
    } else {
      handleAddJob(jobObj);
    }
    setShowModal(false);
    setEditingJob(null);`;
content = content.replace(handleSubmitRegex, replaceWith);

fs.writeFileSync('src/components/JobsView.tsx', content, 'utf8');
