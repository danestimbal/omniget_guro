<script lang="ts">
  import SettingsField from "./SettingsField.svelte";
  import SettingsSelect from "./SettingsSelect.svelte";
  import type { StudySettings } from "$lib/study-bridge";

  type Props = {
    settings: StudySettings;
    onPatch: (patch: StudySettings) => void;
  };

  let { settings, onPatch }: Props = $props();
  const player = $derived(settings.player ?? {});
  const langOptions = [
    { value: "pt-BR", label: "Português (Brasil)" },
    { value: "pt", label: "Português" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
  ];
</script>

<section class="tab">
  <SettingsField
    label="Default audio language"
    description="Track auto-selected when a lesson has audio in multiple languages (video sidecars + .lang.m4a)"
  >
    <SettingsSelect
      value={player.audio_default_lang ?? "pt-BR"}
      options={langOptions}
      onChange={(v) => onPatch({ player: { ...(settings.player ?? {}), audio_default_lang: v } })}
    />
  </SettingsField>

  <SettingsField
    label="Secondary language"
    description="Fallback when the default language is not available in the lesson"
  >
    <SettingsSelect
      value={player.audio_secondary_lang ?? "en"}
      options={langOptions}
      onChange={(v) => onPatch({ player: { ...(settings.player ?? {}), audio_secondary_lang: v } })}
    />
  </SettingsField>
</section>

<style>
  .tab {
    display: flex;
    flex-direction: column;
  }
</style>
