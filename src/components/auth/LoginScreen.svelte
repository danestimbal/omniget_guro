<script lang="ts">
  import { auth, authUser, authPlan } from "$lib/firebase";
  import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithCredential,
    signOut
  } from "firebase/auth";
  import { t } from "$lib/i18n";
  import { open } from "@tauri-apps/plugin-shell";
  import { invoke } from "@tauri-apps/api/core";

  // OAuth client IDs are public identifiers (they appear in every auth URL).
  // Both belong to the guroai-3932b Firebase project; the Firebase auth
  // handler is a registered redirect URI on each of them.
  const GOOGLE_CLIENT_ID = "148071675834-co16b3tulu9cu3bijsercf67komsbv8u.apps.googleusercontent.com";
  const MICROSOFT_CLIENT_ID = "cc4e0425-a7fa-4042-b29b-f8b333c0d15a";
  const OAUTH_REDIRECT_URI = `https://${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}/__/auth/handler`;

  let email = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);

  let currentPlan = $derived($authPlan);
  let user = $derived($authUser);

  function getFriendlyError(err: any, defaultMsg: string) {
    if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
      return "Invalid email or password. If you don't have an account, please subscribe to Premium+ at gurohub.com to get access.";
    }
    if (err.code === "auth/popup-closed-by-user") {
      return "Sign-in was cancelled.";
    }
    return err.message || defaultMsg;
  }

  async function handleEmailLogin(e: Event) {
    e.preventDefault();
    error = "";
    loading = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      error = getFriendlyError(err, "Failed to log in.");
    } finally {
      loading = false;
    }
  }

  // Firebase's signInWithRedirect/signInWithPopup cannot complete inside the
  // Tauri webview (the redirect round-trip loses the auth result and the app
  // reloads to the login screen). Instead, run the provider's OAuth flow in a
  // dedicated auth window, capture the callback URL, and sign in to Firebase
  // with the returned token via signInWithCredential.
  async function runOAuthWebview(authUrl: string, title: string): Promise<URLSearchParams> {
    const result = await invoke<{ finalUrl: string }>("open_auth_webview", {
      request: {
        url: authUrl,
        title,
        cookieDomains: [],
        successUrlContains: "/__/auth/handler",
        captureUrlOnly: true,
        width: 520,
        height: 660,
      },
    });

    const callbackUrl = new URL(result.finalUrl);
    // Tokens arrive in the URL fragment; provider errors can arrive in either
    // the fragment or the query string.
    const params = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
    for (const [key, value] of callbackUrl.searchParams) {
      if (!params.has(key)) params.set(key, value);
    }

    const oauthError = params.get("error");
    if (oauthError) {
      const description = params.get("error_description");
      throw new Error(description ? `${oauthError}: ${description}` : oauthError);
    }
    return params;
  }

  function isCancelled(err: any): boolean {
    return typeof err === "string"
      ? err.includes("Auth cancelled")
      : err?.message?.includes("Auth cancelled");
  }

  async function handleGoogleLogin() {
    error = "";
    loading = true;
    try {
      const authUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: OAUTH_REDIRECT_URI,
          response_type: "token",
          scope: "openid email profile",
          prompt: "select_account",
        });

      const params = await runOAuthWebview(authUrl, "Sign in with Google");
      const accessToken = params.get("access_token");
      if (!accessToken) {
        throw new Error("Google did not return an access token. Please try again.");
      }

      await signInWithCredential(auth, GoogleAuthProvider.credential(null, accessToken));
    } catch (err: any) {
      if (isCancelled(err)) {
        error = "Sign-in was cancelled.";
      } else {
        error = getFriendlyError(err, "Google sign-in failed.");
      }
    } finally {
      loading = false;
    }
  }

  async function handleMicrosoftLogin() {
    error = "";
    loading = true;
    try {
      // Firebase validates the id_token's nonce claim against the SHA-256 of
      // the raw nonce we pass to signInWithCredential, so send the hash to
      // Microsoft and keep the raw value for Firebase.
      const rawNonce = crypto.randomUUID();
      const hashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawNonce));
      const hashedNonce = Array.from(new Uint8Array(hashBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const authUrl =
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" +
        new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          redirect_uri: OAUTH_REDIRECT_URI,
          response_type: "id_token",
          response_mode: "fragment",
          scope: "openid email profile",
          nonce: hashedNonce,
          prompt: "select_account",
        });

      const params = await runOAuthWebview(authUrl, "Sign in with Microsoft");
      const idToken = params.get("id_token");
      if (!idToken) {
        throw new Error("Microsoft did not return an ID token. Please try again.");
      }

      const credential = new OAuthProvider("microsoft.com").credential({ idToken, rawNonce });
      await signInWithCredential(auth, credential);
    } catch (err: any) {
      if (isCancelled(err)) {
        error = "Sign-in was cancelled.";
      } else {
        error = getFriendlyError(err, "Microsoft sign-in failed.");
      }
    } finally {
      loading = false;
    }
  }

  function handleLogout() {
    signOut(auth);
  }

  function openExternal(url: string) {
    try {
      // Try Tauri shell plugin
      open(url).catch(() => window.open(url, "_blank"));
    } catch (err) {
      // Fallback to regular browser navigation
      window.open(url, "_blank");
    }
  }
</script>

<div class="login-wrapper">
  <div class="login-box">
    <div class="login-header">
      <img src="/guro_ai.gif" alt="GuroHub Logo" class="logo" />
      <h2>Welcome to GuroHub</h2>
      <p class="subtitle">Log in to access your Premium+ features.</p>
    </div>

    {#if user && currentPlan && currentPlan !== "premium_plus"}
      <div class="error-box upgrade-box">
        <h4>Access Denied</h4>
        <p>Your current plan is <strong>{currentPlan}</strong>.</p>
        <p>GuroHub requires a <strong>premium_plus</strong> subscription.</p>
        <div class="upgrade-actions">
          <button class="btn btn-primary" onclick={() => openExternal("https://gurohub.com/")}>Upgrade to Premium+</button>
          <button class="btn btn-secondary" onclick={handleLogout}>Log Out</button>
        </div>
      </div>
    {:else}
      <form class="login-form" onsubmit={handleEmailLogin}>
        {#if error}
          <div class="error-box">{error}</div>
        {/if}

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            placeholder="you@example.com"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            required
            placeholder="••••••••"
          />
        </div>

        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <div class="divider">
        <span>OR</span>
      </div>

      <div class="social-login">
        <button type="button" class="btn btn-outline" onclick={handleGoogleLogin} disabled={loading}>
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
        
        <button type="button" class="btn btn-outline" onclick={handleMicrosoftLogin} disabled={loading}>
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path fill="#f3f3f3" d="M0 0h24v24H0z"/>
            <path fill="#f35325" d="M1 1h10v10H1z"/>
            <path fill="#81bc06" d="M12 1h10v10H12z"/>
            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
            <path fill="#ffba08" d="M12 12h10v10H12z"/>
          </svg>
          Microsoft
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .login-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    width: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
  }

  .login-box {
    width: 100%;
    max-width: 400px;
    background: var(--surface);
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    border: 1px solid var(--border);
  }

  .login-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .logo {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 16px;
  }

  h2 {
    margin: 0 0 8px;
    font-size: 24px;
    font-weight: 600;
  }

  .subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  .form-group {
    margin-bottom: 16px;
  }

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 10px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 14px;
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .btn {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    border: none;
    transition: opacity 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--accent);
    color: #fff;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-secondary {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: var(--surface-hi);
  }

  .btn-outline {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
  }

  .btn-outline:hover:not(:disabled) {
    background: var(--surface-hi);
  }

  .divider {
    display: flex;
    align-items: center;
    text-align: center;
    margin: 20px 0;
    color: var(--text-muted);
    font-size: 12px;
  }

  .divider::before,
  .divider::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid var(--border);
  }

  .divider span {
    padding: 0 10px;
  }

  .social-login {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .error-box {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 13px;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .upgrade-box {
    text-align: center;
  }
  .upgrade-box h4 {
    margin-top: 0;
  }
  .upgrade-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
</style>
