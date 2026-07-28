import { portalDb } from './src/lib/firebase.ts';
async function test() {
  const jobs = await portalDb.loadAll();
  console.log(jobs.map(j => ({ id: j.id, numId: j.id ? parseInt(j.id.replace(/\D/g, "").slice(-8)) || "NO_DIGITS" : "NO_ID", title: j.title })));
}
test();
