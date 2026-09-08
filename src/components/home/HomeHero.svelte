<script lang="ts">
  import Mascot from "$components/mascot/Mascot.svelte";
  import Confetti from "$components/celebrate/Confetti.svelte";
  import { authUser } from "$lib/firebase";
  import { t } from "$lib/i18n";

  type MascotEmotion = "idle" | "downloading" | "error" | "stalled" | "queue" | "complete" | "amazed";

  let {
    emotion,
    compact = false,
    stage = false,
    bubbleText,
    celebrate = false,
  }: {
    emotion: MascotEmotion;
    compact?: boolean;
    stage?: boolean;
    bubbleText?: string;
    celebrate?: boolean;
  } = $props();

  let firstName = $derived.by(() => {
    const user = $authUser;
    if (!user) return "";
    if (user.displayName) return user.displayName.trim().split(/\s+/)[0];
    if (user.email) {
      const local = user.email.split("@")[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return "";
  });

  let greeting = $derived.by(() => {
    if (!firstName) return "";
    const h = new Date().getHours();
    if (h < 12) return $t("home.greeting_morning", { name: firstName });
    if (h < 18) return $t("home.greeting_afternoon", { name: firstName });
    return $t("home.greeting_evening", { name: firstName });
  });
</script>

<div class="home-hero" class:compact class:stage>
  {#if stage}
    <Mascot {emotion} stage />
  {:else}
    <div class="hero-row">
      <Mascot {emotion} compact />
      <div class="hero-text">
        {#if greeting}
          <h1 class="hero-greeting">{greeting}</h1>
        {/if}
        {#if bubbleText}
          <p class="hero-sub" role="status" aria-live="polite">{bubbleText}</p>
        {/if}
      </div>
    </div>
    <div class="hero-divider" aria-hidden="true"></div>
  {/if}
  <Confetti active={celebrate} />
</div>

<style>
  .home-hero {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: var(--space-3);
    padding-top: var(--space-2);
  }

  .home-hero.stage {
    width: auto;
    gap: 0;
    padding-top: 0;
  }

  .hero-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  .hero-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
  }

  .hero-greeting {
    margin: 0;
    font-size: var(--text-2xl);
    line-height: var(--leading-2xl);
    font-weight: 700;
    color: var(--secondary);
  }

  .hero-sub {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--tertiary);
  }

  .hero-divider {
    width: 100%;
    height: 3px;
    border-radius: 999px;
    background: linear-gradient(
      90deg,
      var(--success),
      var(--cta),
      var(--accent),
      var(--error)
    );
  }

  .home-hero.compact {
    gap: var(--space-2);
  }

  .home-hero.compact .hero-greeting {
    font-size: var(--text-xl);
    line-height: var(--leading-xl);
  }

  @media (max-width: 535px) {
    .hero-row {
      flex-direction: column;
      text-align: center;
    }

    .hero-text {
      align-items: center;
      text-align: center;
    }
  }
</style>
