<script lang="ts">
  import SettingsField from "./SettingsField.svelte";
  import SettingsSlider from "./SettingsSlider.svelte";
  import SettingsToggle from "./SettingsToggle.svelte";
  import { pluginInvoke } from "$lib/plugin-invoke";
  import type { StudySettings } from "$lib/study-bridge";

  type Props = {
    settings: StudySettings;
    onPatch: (patch: StudySettings) => void;
  };

  let { settings, onPatch }: Props = $props();
  const library = $derived(settings.library ?? {});
  let rescanning = $state(false);
  let rescanReport = $state<string | null>(null);

  function setLibrary<K extends keyof NonNullable<StudySettings["library"]>>(
    key: K,
    value: NonNullable<StudySettings["library"]>[K],
  ) {
    onPatch({ library: { ...(settings.library ?? {}), [key]: value } });
  }

  async function rescan() {
    rescanning = true;
    rescanReport = null;
    try {
      const r = await pluginInvoke<{
        courses_found: number;
        lessons_found: number;
        ms: number;
        new_lessons_notified?: number;
      }>("study", "study:rescan");
      rescanReport = `${r.courses_found} courses · ${r.lessons_found} lessons · ${r.new_lessons_notified ?? 0} new lessons detected (${r.ms}ms)`;
    } catch (e) {
      rescanReport = e instanceof Error ? e.message : String(e);
    } finally {
      rescanning = false;
    }
  }
</script>

<section class="tab">
  <SettingsField
    label="Watcher enabled"
    description="Automatically detects when course files are added or removed"
  >
    <SettingsToggle
      value={library.watcher_enabled ?? true}
      onChange={(v) => setLibrary("watcher_enabled", v)}
      ariaLabel="Watcher"
    />
  </SettingsField>

  <SettingsField
    label="Include hidden folders"
    description="Includes folders whose name starts with a dot during the scan"
  >
    <SettingsToggle
      value={library.scan_hidden ?? false}
      onChange={(v) => setLibrary("scan_hidden", v)}
      ariaLabel="Hidden folders"
    />
  </SettingsField>

  <SettingsField
    label="Automatic cleanup"
    description="Runs a periodic vacuum (removes old seek logs, dismissed notifications, recents outside the top 50)"
  >
    <SettingsToggle
      value={library.auto_vacuum ?? true}
      onChange={(v) => setLibrary("auto_vacuum", v)}
      ariaLabel="Automatic cleanup"
    />
  </SettingsField>

  <SettingsField
    label="Cleanup interval"
    description="How many days between each vacuum"
    valueDisplay={`${library.auto_vacuum_interval_days ?? 30}d`}
  >
    <SettingsSlider
      value={library.auto_vacuum_interval_days ?? 30}
      min={7}
      max={90}
      step={1}
      onChange={(v) => setLibrary("auto_vacuum_interval_days", v)}
    />
  </SettingsField>

  <div class="actions">
    <div>
      <strong>Re-scan library</strong>
      <p class="hint">Forces detection of new courses/lessons and fires notifications</p>
      {#if rescanReport}
        <p class="report">{rescanReport}</p>
      {/if}
    </div>
    <button type="button" class="btn" disabled={rescanning} onclick={rescan}>
      {rescanning ? "Scanning…" : "Re-scan now"}
    </button>
  </div>
</section>

<style>
  .tab {
    display: flex;
    flex-direction: column;
  }

  .actions {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    margin-top: 16px;
    background: color-mix(in oklab, var(--accent) 4%, transparent);
    border: none;
    border-radius: 8px;
  }

  .hint {
    margin: 4px 0 0;
    font-size: 12px;
    color: color-mix(in oklab, currentColor 60%, transparent);
  }

  .report {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--accent);
  }

  .btn {
    padding: 8px 16px;
    background: var(--accent);
    color: var(--accent-contrast, white);
    border: 1px solid var(--accent);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    flex: 0 0 auto;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
