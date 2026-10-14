const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<button\s+type="submit"\s+className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none flex items-center justify-center gap-1.5"[\s\S]+?<\/button>\s+<\/form>/;

code = code.replace(regex, `<button
                      type="submit"
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none flex items-center justify-center gap-1.5"
                    >
                      Authenticate <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-[10px] font-bold uppercase tracking-wider">Or</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { loginWithGoogle } = await import("./lib/firebase");
                        const user = await loginWithGoogle();
                        if (user && user.email) {
                          if (user.email.toLowerCase() === "admin@company.com" || user.email.toLowerCase() === "psiddik3@gmail.com") {
                            localStorage.setItem("recruit_crm_admin_logged_in_v2", "true");
                            setAdminLoggedIn(true);
                          } else {
                            alert("Access Denied: Your Google account is not authorized as an admin.");
                          }
                        }
                      } catch (e) {
                        console.error(e);
                        alert("Failed to login with Google");
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none cursor-pointer flex items-center justify-center gap-2"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                    Continue with Google
                  </button>`);

fs.writeFileSync('src/App.tsx', code);
