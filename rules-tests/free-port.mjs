/**
 * Runs before `npm test`.
 *
 * `emulators:exec` leaves its Java process alive if a run is interrupted, and the next run
 * then dies with "port taken" rather than a test failure, which reads like a broken suite
 * when nothing is broken at all.
 */
import { execSync } from 'node:child_process';

try {
  const listening = execSync('netstat -ano -p tcp', { encoding: 'utf8' })
    .split('\n')
    .filter((line) => /:8080\s/.test(line) && /LISTENING/i.test(line))
    .map((line) => line.trim().split(/\s+/).pop());

  for (const pid of new Set(listening)) {
    console.log(`Freeing port 8080 (pid ${pid}) left over from an earlier run.`);
    try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch { /* already gone */ }
  }
} catch {
  // No netstat, or nothing listening. Either way the emulator will say so itself.
}
