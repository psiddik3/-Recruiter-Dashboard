const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const stateRegex = /const \[approvalRequest, setApprovalRequest\] = useState<\{\s*id: string;\s*name: string;\s*email: string;\s*designation: string;\s*message\?: string;\s*date: string;\s*\} \| null>\(null\);/;
const newState = `  const [approvalRequest, setApprovalRequest] = useState<{
    id: string;
    name: string;
    email: string;
    designation: string;
    message?: string;
    phone?: string;
    date: string;
  } | null>(null);`;
code = code.replace(stateRegex, newState);

// add to newRec creation inside handleConfirmApproval
const newRecCreation = `const newRec = {
      id: newRecId,
      name: approvalRequest.name,
      email: approvalRequest.email,
      phone: approvalRequest.phone || "",
      designation: approvalRequest.designation,
      sourcedCount: 0,
      accessScope: "local" as const, // default isolated scope
      status: "active" as const,
      joinedDate: new Date().toISOString().split("T")[0],
      password: "password123"
    };`;
code = code.replace(/const newRec = \{\s*id: newRecId,\s*name: approvalRequest\.name,\s*email: approvalRequest\.email,\s*designation: approvalRequest\.designation,\s*sourcedCount: 0,\s*accessScope: "local" as const, \/\/ default isolated scope\s*status: "active" as const,\s*joinedDate: new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\],\s*password: "password123"\s*\};/, newRecCreation);

// add phone display in modal
const modalFields = `                <div><span className="font-bold text-slate-700">Name:</span> {approvalRequest.name}</div>
                <div><span className="font-bold text-slate-700">Email:</span> {approvalRequest.email}</div>
                {approvalRequest.phone && <div><span className="font-bold text-slate-700">Phone:</span> {approvalRequest.phone}</div>}
                <div><span className="font-bold text-slate-700">Designation:</span> {approvalRequest.designation}</div>`;
code = code.replace(/<div><span className="font-bold text-slate-700">Name:<\/span> \{approvalRequest\.name\}<\/div>\s*<div><span className="font-bold text-slate-700">Email:<\/span> \{approvalRequest\.email\}<\/div>\s*<div><span className="font-bold text-slate-700">Designation:<\/span> \{approvalRequest\.designation\}<\/div>/, modalFields);

// add phone display in listing
const listingFields = `<p className="text-xs text-indigo-600 font-semibold">{req.email} {req.phone && \`• \${req.phone}\`}</p>`;
code = code.replace(/<p className="text-xs text-indigo-600 font-semibold">\{req\.email\}<\/p>/, listingFields);

fs.writeFileSync('src/App.tsx', code);
