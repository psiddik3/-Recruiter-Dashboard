const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importCheck = `import { Eye, EyeOff, Check, X, Search, Plus, List, Grid, Shield, UploadCloud, Users, RefreshCw, LogOut, CheckCircle, Clock, Link as LinkIcon, UserPlus, Settings, PieChart, Sparkles, AlertCircle, FileText, Lock, Layout, Filter, ArrowRight, UserX, Image as ImageIcon } from "lucide-react";`;
if (!code.includes('PartyPopper')) {
    code = code.replace(
        'import { Eye, EyeOff, Check, X, Search, Plus, List, Grid, Shield, UploadCloud, Users, RefreshCw, LogOut, CheckCircle, Clock, Link as LinkIcon, UserPlus, Settings, PieChart, Sparkles, AlertCircle, FileText, Lock, Layout, Filter, ArrowRight, UserX, Image as ImageIcon } from "lucide-react";',
        'import { Eye, EyeOff, Check, X, Search, Plus, List, Grid, Shield, UploadCloud, Users, RefreshCw, LogOut, CheckCircle, Clock, Link as LinkIcon, UserPlus, Settings, PieChart, Sparkles, AlertCircle, FileText, Lock, Layout, Filter, ArrowRight, UserX, Image as ImageIcon, PartyPopper } from "lucide-react";'
    );
}

const stateToAdd = `  const [adminError, setAdminError] = useState("");
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
`;
code = code.replace(`  const [adminError, setAdminError] = useState("");`, stateToAdd);

const useEffectToAdd = `  useEffect(() => {
    if (!isAdminMode && loggedInRecruiter && loggedInRecruiter.status === "active") {
      const welcomeKey = \`recruit_crm_welcome_shown_\${loggedInRecruiter.id}\`;
      const hasSeenWelcome = localStorage.getItem(welcomeKey);
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true);
      }
    }
  }, [loggedInRecruiter, isAdminMode]);

`;
code = code.replace(`  useEffect(() => {
    if (!isAdminMode && loggedInRecruiter && loggedInRecruiter.status !== "active") {`, useEffectToAdd + `  useEffect(() => {
    if (!isAdminMode && loggedInRecruiter && loggedInRecruiter.status !== "active") {`);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched states and effect");
