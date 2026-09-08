<script lang="ts">
  import { open } from "@tauri-apps/plugin-shell";
  import { t } from "$lib/i18n";

  const FACEBOOK_URL = "https://www.facebook.com/gurohub";
  const APP_VERSION = "0.9.1";

  async function openFacebook() {
    await open(FACEBOOK_URL);
  }
</script>

<section class="star-section">
  <button class="star-button" onclick={openFacebook} style="background: #1877F2;">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
    Facebook
  </button>
</section>

<section class="project-header">
  <img src="/guro_ai.gif" alt="GuroHub" class="project-logo" width="64" height="64" />
  <p class="project-description">{$t('about.description')}</p>
</section>

<section class="card">
  <h5 class="card-title">{$t('about.features_title')}</h5>
  <div class="features-list">
    <p class="feature-item">{$t('about.feature_platforms')}</p>
    <p class="feature-item">{$t('about.feature_hotmart')}</p>
    <p class="feature-item">{$t('about.feature_progress')}</p>
    <p class="feature-item">{$t('about.feature_mascot')}</p>
    <p class="feature-item">{$t('about.feature_themes')}</p>
    <p class="feature-item">{$t('about.feature_i18n')}</p>
    <p class="feature-item">{$t('about.feature_tech')}</p>
  </div>
</section>

<p class="version">{$t('about.version')} {APP_VERSION}</p>

<style>
  .star-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--padding);
    width: 100%;
  }

  .star-description {
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--secondary);
  }

  .star-iframe-wrapper {
    display: flex;
    justify-content: center;
  }

  .star-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: calc(var(--padding) / 2);
    margin: 0 auto;
    padding: calc(var(--padding) / 2) calc(var(--padding) * 1.5);
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--text);
    background: var(--surface);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-out);
  }

  .star-button svg {
    pointer-events: none;
    flex-shrink: 0;
    color: var(--warning);
  }

  @media (hover: hover) {
    .star-button:hover {
      background: var(--surface-hi);
    }
  }

  .star-button:active {
    background: var(--fill-2);
  }

  .star-button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
  }

  .project-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--padding) / 2);
    text-align: center;
  }

  .project-logo {
    border-radius: calc(var(--border-radius) + 4px);
    pointer-events: none;
  }

  .project-description {
    font-size: var(--text-base);
    font-weight: 400;
    line-height: 1.8;
    color: var(--gray);
    max-width: 320px;
  }

  .card {
    width: 100%;
    background: var(--button);
    box-shadow: var(--button-box-shadow);
    border-radius: var(--border-radius);
    padding: calc(var(--padding) + 4px);
    display: flex;
    flex-direction: column;
    gap: calc(var(--padding) / 2);
  }

  .card-title {
    color: var(--secondary);
  }

  .features-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .feature-item {
    font-size: 13px;
    font-weight: 400;
    line-height: 1.6;
    color: var(--gray);
  }

  .feature-item::before {
    content: "• ";
    color: var(--accent);
  }

  .version {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--gray);
    text-align: center;
  }
</style>
