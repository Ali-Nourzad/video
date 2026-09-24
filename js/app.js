function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function date(v){return v?new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"-"}
function bytes(n){if(!n)return"0 B";const u=["B","KB","MB","GB"],i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),3);return`${(n/Math.pow(1024,i)).toFixed(1)} ${u[i]}`}
function statusText(s){return({new:"جدید",review:"در حال بررسی",approved:"تأیید شده",production:"در حال تولید",editing:"در حال تدوین",revision:"نیازمند اصلاح",ready:"آماده تحویل",completed:"تکمیل شده",cancelled:"لغو شده"}[s]||s||"-")}
function modelText(s){return({edit_only:"صوت و تصویر آماده؛ فقط تدوین",voice_ready:"صوت آماده؛ تصویر و تدوین",visual_ready:"تصویر آماده؛ صوت و تدوین",script_ready:"سناریو آماده؛ صوت، تصویر و تدوین",full_production:"سناریو، صوت، تصویر و تدوین"}[s]||s||"-")}
function theme(){const d=localStorage.getItem("tchoob-video-theme")==="dark";document.documentElement.classList.toggle("dark-mode",d);const b=document.getElementById("theme");if(b)b.textContent=d?"حالت روشن":"حالت تاریک"}
function toggleTheme(){localStorage.setItem("tchoob-video-theme",document.documentElement.classList.contains("dark-mode")?"light":"dark");theme()}
document.addEventListener("DOMContentLoaded",()=>{theme();const b=document.getElementById("theme");if(b)b.onclick=toggleTheme})
