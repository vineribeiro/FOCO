import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const mobile = read("src/components/BottomNavBar.tsx");
const desktop = read("src/components/DesktopNav.tsx");
const progress = read("src/pages/ProgressPage.tsx");
const okok = read("src/components/OkokEvolutionSection.tsx");
const app = read("src/App.tsx");
const session = read("src/pages/ActiveSessionPage.tsx");
const dashboard = read("src/pages/DashboardPage.tsx");
const css = read("src/index.css");

const expectedNavigation = ["dashboard", "sessao", "progresso", "biblioteca", "perfil"];
for (const id of expectedNavigation) {
  assert.match(mobile, new RegExp("id: '" + id + "'"), "Mobile menu missing " + id);
  assert.match(desktop, new RegExp("id: '" + id + "'"), "Desktop menu missing " + id);
}
assert.equal((mobile.match(/id: 'dashboard'/g) || []).length, 1);
assert.equal((mobile.match(/id: 'progresso'/g) || []).length, 1);
assert.equal((desktop.match(/id: 'progresso'/g) || []).length, 1);
assert.match(mobile, /aria-current=\{selected \? 'page'/);
assert.match(desktop, /aria-current=\{selected \? 'page'/);
assert.match(mobile, /activeTab === 'progresso'/);
assert.match(app, /case 'progresso'/);
assert.match(app, /case 'arquivos'/);
assert.match(app, /href="#foco-main-content"/);
assert.match(app, /id="foco-main-content" tabIndex=\{-1\}/);
assert.match(app, /window.scrollTo\(0, 0\)/);

assert.match(okok, /Principais indicadores/);
assert.match(okok, /Ver todos os indicadores/);
assert.match(okok, /otherMetrics/);
assert.match(okok, /latest\.metrics/);
assert.match(okok, /getOkokAssessments/);
assert.match(okok, /getOkokTrend/);
assert.match(progress, /<OkokEvolutionSection period=\{period\}/);
assert.match(progress, /htmlFor="foco-measurement-value"/);
assert.match(progress, /id="foco-measurement-value"/);
assert.match(progress, /dataUnavailable/);
assert.match(progress, /role="alert"/);

assert.match(session, /min-h-12/);
assert.match(session, /foco-touch/);
assert.match(session, /Preferências de descanso e som/);
assert.match(session, /aria-label="Progresso de séries concluídas"/);
assert.match(session, /aria-label=\{set\.completed \?/);
assert.match(dashboard, /foco-v4-week/);
assert.match(css, /safe-area-inset-bottom/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /:focus-visible/);

console.log("FOCO UX guardrails: navigation, readable metrics, safety of unavailable data, semantics, and mobile controls OK.");
