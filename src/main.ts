import { initTheme } from './theme.ts';
import { initModals } from './modals.ts';
import { showToast } from './toast.ts';
import { auditCookies } from './cookies.ts';
import { auditVault } from './vault.ts';
import { adviseLocalModel, DeviceKind } from './calc.ts';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModals();

  const audit = auditCookies();
  const vault = auditVault();
  console.log(`[OTHRYS] HardwareFit initialized. Cookies: ${audit.totalCookies}, Vault: ${vault.clientSideOnly}`);

  const deviceSelect = document.getElementById('device-kind') as HTMLSelectElement | null;
  const vramInput = document.getElementById('vram-input') as HTMLInputElement | null;
  const ramInput = document.getElementById('ram-input') as HTMLInputElement | null;
  const contextSelect = document.getElementById('context-input') as HTMLSelectElement | null;
  const outputRegion = document.getElementById('output-region');
  const copyBtn = document.getElementById('action-copy');

  function renderAssessment() {
    if (!outputRegion || !deviceSelect || !vramInput || !ramInput || !contextSelect) return;

    const kind = deviceSelect.value as DeviceKind;
    const vram = Math.max(0, parseFloat(vramInput.value || '0'));
    const ram = Math.max(1, parseFloat(ramInput.value || '1'));
    const contextK = parseInt(contextSelect.value || '8', 10);

    const assessment = adviseLocalModel(kind, vram, ram, contextK);

    const fitBadge = (fit: string) => {
      if (fit === 'likely') return `<span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.75rem;">RUNS LOCALLY</span>`;
      if (fit === 'borderline') return `<span style="background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.75rem;">BORDERLINE / CPU SPILL</span>`;
      return `<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.75rem;">TOO HEAVY</span>`;
    };

    outputRegion.innerHTML = `
      <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--color-surface); border-radius: 6px; border: 1px solid var(--color-border); font-size: 0.85rem;">
        <p style="margin: 0 0 0.25rem 0; font-weight: 600; color: var(--color-primary);">${assessment.intro}</p>
        <p style="margin: 0; color: var(--color-text-muted); font-size: 0.8rem;">Usable Target Pool: <strong>${assessment.usableMemory} GB</strong> · Evaluated at <strong>${contextK}k context</strong> · Q4_K_M weights.</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${assessment.models.map(m => `
          <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 6px; padding: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: var(--color-text); font-size: 0.95rem;">${m.label}</strong>
              ${fitBadge(m.fit)}
            </div>
            <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.4rem;">
              <span>Model Weights: ~${m.weightsGb} GB</span>
              <span>Total Est. Memory: ~${m.estimateGb} GB</span>
            </div>
            <p style="margin: 0; font-size: 0.8rem; color: var(--color-text-muted);">${m.note}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  [deviceSelect, vramInput, ramInput, contextSelect].forEach(el => {
    if (el) el.addEventListener('input', renderAssessment);
    if (el) el.addEventListener('change', renderAssessment);
  });

  const setupPreset = (id: string, kind: DeviceKind, vram: number, ram: number) => {
    const btn = document.getElementById(id);
    if (btn && deviceSelect && vramInput && ramInput) {
      btn.addEventListener('click', () => {
        deviceSelect.value = kind;
        vramInput.value = vram.toString();
        ramInput.value = ram.toString();
        renderAssessment();
        showToast(`Loaded ${btn.textContent} preset.`);
      });
    }
  };

  setupPreset('action-preset-rtx4060', 'nvidia', 8, 32);
  setupPreset('action-preset-rtx4090', 'nvidia', 24, 64);
  setupPreset('action-preset-m3max', 'apple', 0, 36);
  setupPreset('action-preset-laptop', 'cpu', 0, 16);

  if (copyBtn && deviceSelect && vramInput && ramInput && contextSelect) {
    copyBtn.addEventListener('click', async () => {
      const kind = deviceSelect.value as DeviceKind;
      const vram = Math.max(0, parseFloat(vramInput.value || '0'));
      const ram = Math.max(1, parseFloat(ramInput.value || '1'));
      const contextK = parseInt(contextSelect.value || '8', 10);
      const res = adviseLocalModel(kind, vram, ram, contextK);

      const report = [
        `=== OTHRYS HardwareFit Report ===`,
        `Platform: ${kind.toUpperCase()} (Usable Pool: ${res.usableMemory} GB)`,
        `Target Context: ${contextK}k tokens`,
        ...res.models.map(m => `• ${m.label}: [${m.fit.toUpperCase()}] Weights: ${m.weightsGb}GB, Total: ~${m.estimateGb}GB`),
        `Client Shield: 100% Client-Side, Zero Telemetry`,
      ].join('\n');

      await navigator.clipboard.writeText(report);
      showToast('Assessment copied to clipboard!');
    });
  }

  renderAssessment();
});
