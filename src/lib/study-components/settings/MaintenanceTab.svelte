<script lang="ts">
  import {
    studyLibraryVacuum,
    studyLibraryExportState,
    studyLibraryImportState,
    type ExportedState,
    type ImportMode,
    type VacuumResult,
    type ImportResult,
  } from "$lib/study-bridge";

  type Props = {
    onToast: (kind: "ok" | "err", msg: string) => void;
  };

  let { onToast }: Props = $props();

  let vacuumRunning = $state(false);
  let vacuumConfirmOpen = $state(false);
  let lastVacuum = $state<VacuumResult | null>(null);

  let exporting = $state(false);

  let importPreview = $state<ExportedState | null>(null);
  let importMode = $state<ImportMode>("merge");
  let importDoubleConfirm = $state(false);
  let importing = $state(false);
  let lastImport = $state<ImportResult | null>(null);

  async function runVacuum() {
    vacuumConfirmOpen = false;
    vacuumRunning = true;
    try {
      const r = await studyLibraryVacuum();
      lastVacuum = r;
      onToast(
        "ok",
        `Cleanup: ${r.seek_logs_deleted} logs, ${r.notifications_deleted} notifications, ${r.recents_deleted} recents`,
      );
    } catch (e) {
      onToast("err", e instanceof Error ? e.message : String(e));
    } finally {
      vacuumRunning = false;
    }
  }

  async function exportData() {
    exporting = true;
    try {
      const data = await studyLibraryExportState({});
      const json = JSON.stringify(data, null, 2);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `study-library-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onToast("ok", `Exported ${data.courses.length} courses`);
    } catch (e) {
      onToast("err", e instanceof Error ? e.message : String(e));
    } finally {
      exporting = false;
    }
  }

  let fileInput = $state<HTMLInputElement | null>(null);

  function pickImport() {
    fileInput?.click();
  }

  async function onFileChosen(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importPreview = JSON.parse(text) as ExportedState;
      importMode = "merge";
      importDoubleConfirm = false;
    } catch (e2) {
      onToast("err", e2 instanceof Error ? e2.message : String(e2));
    } finally {
      target.value = "";
    }
  }

  function cancelImport() {
    importPreview = null;
    importDoubleConfirm = false;
  }

  async function confirmImport() {
    if (!importPreview) return;
    if (importMode === "overwrite" && !importDoubleConfirm) {
      importDoubleConfirm = true;
      return;
    }
    importing = true;
    try {
      const r = await studyLibraryImportState({
        payload: importPreview,
        mode: importMode,
      });
      lastImport = r;
      onToast(
        "ok",
        `Import ${r.mode}: ${r.imported} imported, ${r.skipped} skipped, ${r.missing} missing`,
      );
      importPreview = null;
      importDoubleConfirm = false;
    } catch (e) {
      onToast("err", e instanceof Error ? e.message : String(e));
    } finally {
      importing = false;
    }
  }

  function fmtExportedAt(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }
</script>

<section class="tab">
  <article class="card">
    <header class="card-head">
      <div>
        <h3>Cleanup</h3>
        <p class="hint">
          Removes: seek logs older than 30 days, dismissed notifications older than 90 days,
          recents outside the top 50.
        </p>
      </div>
    </header>
    {#if lastVacuum}
      <p class="report">
        Last: {lastVacuum.seek_logs_deleted} logs · {lastVacuum.notifications_deleted} notifications
        · {lastVacuum.recents_deleted} recents
      </p>
    {/if}
    <div class="actions">
      <button
        type="button"
        class="btn primary"
        disabled={vacuumRunning}
        onclick={() => (vacuumConfirmOpen = true)}
      >
        {vacuumRunning ? "Cleaning…" : "Run cleanup"}
      </button>
    </div>
  </article>

  <article class="card">
    <header class="card-head">
      <div>
        <h3>Export data</h3>
        <p class="hint">
          Saves a JSON file with the state of every course (progress, watched, recents).
          Useful for backup or switching machines.
        </p>
      </div>
    </header>
    <div class="actions">
      <button
        type="button"
        class="btn primary"
        disabled={exporting}
        onclick={exportData}
      >
        {exporting ? "Exporting…" : "Export now"}
      </button>
    </div>
  </article>

  <article class="card">
    <header class="card-head">
      <div>
        <h3>Import data</h3>
        <p class="hint">
          Loads a JSON backup. You choose the merge mode before applying.
        </p>
      </div>
    </header>
    {#if lastImport}
      <p class="report">
        Last: {lastImport.imported} imported · {lastImport.skipped} skipped · {lastImport.missing} missing
        ({lastImport.mode})
      </p>
    {/if}
    <div class="actions">
      <input
        type="file"
        accept="application/json,.json"
        bind:this={fileInput}
        onchange={onFileChosen}
        style:display="none"
      />
      <button type="button" class="btn ghost" onclick={pickImport}>
        Select file…
      </button>
    </div>
  </article>
</section>

{#if vacuumConfirmOpen}
  <div class="modal-bg" role="dialog" aria-modal="true" aria-label="Confirm cleanup">
    <button type="button" class="bg-btn" aria-label="Close" onclick={() => (vacuumConfirmOpen = false)}></button>
    <div class="modal" role="document">
      <h3>Run cleanup?</h3>
      <p>The following items will be permanently deleted:</p>
      <ul>
        <li>Seek logs older than 30 days</li>
        <li>Dismissed notifications older than 90 days</li>
        <li>Recents outside the 50 most used</li>
      </ul>
      <p class="reassure">Does not affect progress, notes or the watched-lessons bitfield.</p>
      <div class="modal-actions">
        <button type="button" class="btn ghost" onclick={() => (vacuumConfirmOpen = false)}>Cancel</button>
        <button type="button" class="btn primary" onclick={runVacuum}>Confirm</button>
      </div>
    </div>
  </div>
{/if}

{#if importPreview}
  <div class="modal-bg" role="dialog" aria-modal="true" aria-label="Confirm import">
    <button type="button" class="bg-btn" aria-label="Close" onclick={cancelImport}></button>
    <div class="modal" role="document">
      <h3>Import {importPreview.courses.length} {importPreview.courses.length === 1 ? "course" : "courses"}?</h3>
      <p class="hint">Backup exported on {fmtExportedAt(importPreview.exported_at)}</p>

      <fieldset class="modes">
        <legend>Merge mode</legend>
        <label class="mode-row" class:selected={importMode === "skip"}>
          <input
            type="radio"
            name="mode"
            value="skip"
            checked={importMode === "skip"}
            onchange={() => {
              importMode = "skip";
              importDoubleConfirm = false;
            }}
          />
          <span>
            <strong>Skip</strong> — keeps existing state, only imports courses with no local state
          </span>
        </label>
        <label class="mode-row recommended" class:selected={importMode === "merge"}>
          <input
            type="radio"
            name="mode"
            value="merge"
            checked={importMode === "merge"}
            onchange={() => {
              importMode = "merge";
              importDoubleConfirm = false;
            }}
          />
          <span>
            <strong>Merge</strong> <span class="rec-tag">recommended</span> — keeps the higher progress between local and backup
          </span>
        </label>
        <label class="mode-row danger" class:selected={importMode === "overwrite"}>
          <input
            type="radio"
            name="mode"
            value="overwrite"
            checked={importMode === "overwrite"}
            onchange={() => {
              importMode = "overwrite";
              importDoubleConfirm = false;
            }}
          />
          <span>
            <strong>Overwrite</strong> — replaces ALL local state with the backup's (irreversible)
          </span>
        </label>
      </fieldset>

      {#if importMode === "overwrite" && importDoubleConfirm}
        <div class="warning">
          <strong>Are you sure?</strong> This will erase local progress that isn't in the backup.
          We recommend exporting first.
        </div>
      {/if}

      <div class="modal-actions">
        <button type="button" class="btn ghost" onclick={cancelImport}>Cancel</button>
        <button
          type="button"
          class="btn"
          class:primary={importMode !== "overwrite"}
          class:danger={importMode === "overwrite"}
          disabled={importing}
          onclick={confirmImport}
        >
          {#if importing}
            Importing…
          {:else if importMode === "overwrite" && !importDoubleConfirm}
            Continue with Overwrite
          {:else if importMode === "overwrite"}
            Confirm Overwrite
          {:else}
            Import ({importMode})
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .tab {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .card {
    padding: 16px 18px;
    background: var(--surface);
    border: none;
    border-radius: var(--border-radius, 10px);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card-head h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .hint {
    margin: 4px 0 0;
    font-size: 12px;
    color: color-mix(in oklab, currentColor 60%, transparent);
    line-height: 1.5;
  }

  .report {
    margin: 0;
    padding: 8px 10px;
    background: color-mix(in oklab, var(--accent) 8%, transparent);
    border-radius: 6px;
    font-size: 12px;
    color: var(--accent);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    background: transparent;
    color: inherit;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.primary {
    background: var(--accent);
    color: var(--accent-contrast, white);
    border-color: var(--accent);
  }

  .btn.primary:not(:disabled):hover {
    filter: brightness(1.05);
  }

  .btn.danger {
    background: var(--error);
    color: white;
    border-color: var(--error);
  }

  .btn.ghost:hover {
    background: color-mix(in oklab, currentColor 8%, transparent);
  }

  .modal-bg {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: grid;
    place-items: center;
    background: color-mix(in oklab, black 50%, transparent);
  }

  .bg-btn {
    position: absolute;
    inset: 0;
    background: transparent;
    border: none;
    cursor: default;
  }

  .modal {
    position: relative;
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    background: var(--content-bg);
    border-radius: 14px;
    padding: 20px 24px;
    box-shadow: 0 16px 48px color-mix(in oklab, black 40%, transparent);
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .modal h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .modal p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
  }

  .modal ul {
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    line-height: 1.6;
  }

  .reassure {
    color: color-mix(in oklab, var(--success) 90%, transparent);
    font-size: 12px;
  }

  .modes {
    border: none;
    padding: 0;
    margin: 8px 0 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .modes legend {
    font-size: 12px;
    color: color-mix(in oklab, currentColor 60%, transparent);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .mode-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1.4;
  }

  .mode-row.selected {
    border-color: var(--accent);
    background: color-mix(in oklab, var(--accent) 6%, transparent);
  }

  .mode-row.danger.selected {
    border-color: var(--error);
    background: color-mix(in oklab, var(--error) 6%, transparent);
  }

  .rec-tag {
    margin-left: 4px;
    padding: 1px 6px;
    background: color-mix(in oklab, var(--success) 14%, transparent);
    color: var(--success);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-radius: 999px;
    font-weight: 600;
  }

  .warning {
    padding: 10px 12px;
    border-radius: 8px;
    background: color-mix(in oklab, var(--error) 10%, transparent);
    color: var(--error);
    border: 1px solid color-mix(in oklab, var(--error) 30%, transparent);
    font-size: 12px;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
</style>
