<script lang="ts">
  import SettingsField from "./SettingsField.svelte";
  import SettingsSlider from "./SettingsSlider.svelte";
  import SettingsToggle from "./SettingsToggle.svelte";
  import type { StudySettings } from "$lib/study-bridge";

  type Props = {
    settings: StudySettings;
    onPatch: (patch: StudySettings) => void;
  };

  let { settings, onPatch }: Props = $props();
  const player = $derived(settings.player ?? {});

  function setPlayer<K extends keyof NonNullable<StudySettings["player"]>>(
    key: K,
    value: NonNullable<StudySettings["player"]>[K],
  ) {
    onPatch({ player: { ...(settings.player ?? {}), [key]: value } });
  }
</script>

<section class="tab">
  <SettingsField
    label="Auto-play next lesson"
    description="When you finish a lesson, the next one starts automatically after a countdown"
  >
    <SettingsToggle
      value={player.binge_watching ?? true}
      onChange={(v) => setPlayer("binge_watching", v)}
      ariaLabel="Auto-play"
    />
  </SettingsField>

  <SettingsField
    label="Countdown time"
    description="How many seconds the auto-play notice shows before skipping"
    valueDisplay={`${(player.next_video_notification_ms ?? 5000) / 1000}s`}
  >
    <SettingsSlider
      value={player.next_video_notification_ms ?? 5000}
      min={1000}
      max={15000}
      step={500}
      onChange={(v) => setPlayer("next_video_notification_ms", v)}
    />
  </SettingsField>

  <SettingsField
    label="Collect seek history"
    description="Records where you rewind to build a difficulty heatmap. Local only — nothing leaves your machine"
  >
    <SettingsToggle
      value={player.collect_seek_logs ?? true}
      onChange={(v) => setPlayer("collect_seek_logs", v)}
      ariaLabel="Collect history"
    />
  </SettingsField>
</section>

<style>
  .tab {
    display: flex;
    flex-direction: column;
  }
</style>
