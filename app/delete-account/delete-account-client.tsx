"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type FirebaseUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  delete(): Promise<void>;
};
type FirebaseAuthCompat = {
  signInWithPopup(provider: unknown): Promise<{ user: FirebaseUser }>;
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void;
  signOut(): Promise<void>;
};
type FirebaseCompat = {
  apps: unknown[];
  initializeApp(options: Record<string, string | undefined>): void;
  auth: (() => FirebaseAuthCompat) & { OAuthProvider: new (providerId: string) => { setCustomParameters(parameters: Record<string, string>): void } };
  database(): { ref(path?: string): { once(event: "value"): Promise<{ exists(): boolean }>; update(values: Record<string, null>): Promise<void> } };
};

declare global {
  interface Window { firebase?: FirebaseCompat; }
}

const firebaseScriptUrls = [
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-database-compat.js",
];
let firebaseSdkPromise: Promise<FirebaseCompat> | null = null;

function loadScript(url: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Firebase SDK could not be loaded. Check your network and reload."));
    document.head.appendChild(script);
  });
}

function loadFirebaseSdk() {
  if (window.firebase?.auth) return Promise.resolve(window.firebase);
  if (!firebaseSdkPromise) {
    firebaseSdkPromise = (async () => {
      for (const url of firebaseScriptUrls) await loadScript(url);
      if (!window.firebase) throw new Error("Firebase SDK could not be loaded.");
      return window.firebase;
    })().catch(error => {
      firebaseSdkPromise = null;
      throw error;
    });
  }
  return firebaseSdkPromise;
}

type DeletionStage = "email" | "google" | "confirm" | "complete";

function firebaseOptions() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

function getFirebase() {
  const options = firebaseOptions();
  const missing = Object.entries(options).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Firebase web configuration is missing: ${missing.join(", ")}.`);
  const firebase = window.firebase;
  if (!firebase) throw new Error("Firebase SDK is still loading. Try again in a moment.");
  if (!firebase.apps.length) firebase.initializeApp(options);
  return { auth: firebase.auth(), db: firebase.database() };
}

function describeError(error: unknown) {
  if (error instanceof Error && error.message.startsWith("Firebase web configuration")) return error.message;
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Those sign-in details are incorrect. Try again or choose Google sign-in.",
    "auth/user-not-found": "No account was found for those sign-in details.",
    "auth/wrong-password": "Those sign-in details are incorrect. Try again.",
    "auth/operation-not-allowed": "This sign-in provider is not enabled in Firebase Authentication.",
    "auth/unauthorized-domain": "This site domain is not authorized in Firebase Authentication.",
    "auth/popup-closed-by-user": "The Google sign-in window was closed before sign-in finished.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.",
    "auth/account-exists-with-different-credential": "This email uses a different sign-in method. Try the method used for your SRA account.",
    "auth/requires-recent-login": "Sign in again, then retry the deletion.",
    "database/permission-denied": "Firebase Database rules blocked access. The project owner must allow signed-in users to read and delete only their own records.",
  };
  return messages[code] || "The request could not be completed. Check the Firebase setup and your connection, then try again.";
}

export function DeleteAccountClient() {
  const [stage, setStage] = useState<DeletionStage>("email");
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [hasSraData, setHasSraData] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"error" | "success" | "">("");
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const checkedUid = useRef<string | null>(null);
  const requestedEmail = useRef("");

  const setMessage = useCallback((message: string, kind: "error" | "success" | "" = "") => {
    setStatus(message);
    setStatusKind(kind);
  }, []);

  const acceptVerifiedUser = useCallback(async (verifiedUser: FirebaseUser) => {
    if (checkedUid.current === verifiedUser.uid) return;
    if (requestedEmail.current && verifiedUser.email?.toLowerCase() !== requestedEmail.current) {
      const { auth } = getFirebase();
      await auth.signOut();
      setMessage("The Google account must match the email address you entered.", "error");
      return;
    }
    checkedUid.current = verifiedUser.uid;
    setBusy(true);
    setMessage("Checking for your SRA account data…");
    try {
      const { db } = getFirebase();
      const [driver, calculations] = await Promise.all([
        db.ref(`/drivers/${verifiedUser.uid}`).once("value"),
        db.ref(`/ride_calculations/${verifiedUser.uid}`).once("value"),
      ]);
      setHasSraData(driver.exists() || calculations.exists());
      setUser(verifiedUser);
      setStage("confirm");
      setMessage("Your identity is verified. Review the warning before continuing.", "success");
    } catch (error) {
      checkedUid.current = null;
      setMessage(describeError(error), "error");
    } finally {
      setBusy(false);
    }
  }, [setMessage]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: () => void = () => {};
    void loadFirebaseSdk().then(() => {
      if (cancelled) return;
      const { auth } = getFirebase();
      sessionStorage.removeItem("sraDeletionEmail");
      setSdkLoaded(true);
      unsubscribe = auth.onAuthStateChanged(activeUser => {
        if (activeUser) void acceptVerifiedUser(activeUser);
      });
    }).catch(error => setMessage(describeError(error), "error"));
    return () => { cancelled = true; unsubscribe(); };
  }, [acceptVerifiedUser, setMessage]);

  async function continueWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    requestedEmail.current = normalizedEmail;
    setEmail(normalizedEmail);
    setMessage("");
    setStage("google");
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage("Opening Google sign-in…");
    try {
      const { auth } = getFirebase();
      const provider = new window.firebase!.auth.OAuthProvider("google.com");
      provider.setCustomParameters({ prompt: "select_account", ...(requestedEmail.current ? { login_hint: requestedEmail.current } : {}) });
      const credential = await auth.signInWithPopup(provider);
      await acceptVerifiedUser(credential.user);
    } catch (error) {
      setBusy(false);
      setMessage(describeError(error), "error");
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      const { auth } = getFirebase();
      await auth.signOut();
      checkedUid.current = null;
      setUser(null);
      setStage("email");
      setEmail("");
      requestedEmail.current = "";
      setAcknowledged(false);
      setMessage("You are signed out. Your account has not been deleted.");
    } catch (error) {
      setMessage(describeError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!user || !acknowledged) return;
    setBusy(true);
    setMessage("Deleting your SRA records and sign-in account…");
    try {
      const { auth, db } = getFirebase();
      await db.ref().update({
        [`/drivers/${user.uid}`]: null,
        [`/ride_calculations/${user.uid}`]: null,
      });
      await user.delete();
      await auth.signOut().catch(() => undefined);
      setUser(null);
      setStage("complete");
      setMessage("Your Firebase account and the SRA records covered by this page have been deleted.", "success");
    } catch (error) {
      setMessage(describeError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="delete-account-shell">
      <header><div className="container"><Link href="/" className="brand">Smart Ride Advisor</Link></div></header>
      <main className="container">
        <p className="eyebrow">Account &amp; data deletion</p>
        <h1>Delete your account</h1>
        <p className="muted">Enter your account email, verify ownership with Google, then review the warning before permanently deleting your account and associated SRA data.</p>
        <p className={`delete-status ${statusKind}`} role="status" aria-live="polite">{status}</p>

        {stage === "email" && <section className="delete-card" aria-labelledby="signin-heading">
          <h2 id="signin-heading" style={{ marginTop: 0 }}>Enter your account email</h2>
          <form onSubmit={continueWithEmail}>
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
            <button type="submit" disabled={busy || !sdkLoaded}>Continue</button>
          </form>
          <div className="delete-notice">Phone-only accounts can be deleted from the signed-in Android app or through <a href="mailto:smartrideadvisor.support@gmail.com?subject=SRA%20account%20deletion%20request">support</a>. This page does not send SMS codes.</div>
        </section>}

        {stage === "google" && <section className="delete-card" aria-labelledby="google-heading">
          <h2 id="google-heading" style={{ marginTop: 0 }}>Verify with Google</h2>
          <p className="muted">Continue with the Google account for <strong>{email}</strong>. We’ll check for its SRA profile after sign-in.</p>
          <button className="google-button" type="button" onClick={signInWithGoogle} disabled={busy || !sdkLoaded}>
            <GoogleMark /> Continue with Google
          </button>
          <button className="secondary" type="button" onClick={() => { setStage("email"); requestedEmail.current = ""; setMessage(""); }} disabled={busy}>Back</button>
        </section>}

        {stage === "confirm" && user && <section className="delete-card" aria-labelledby="confirm-heading">
          <h2 id="confirm-heading" style={{ marginTop: 0 }}>This permanently deletes your data</h2>
          <div className="delete-notice danger-note">{hasSraData
            ? "The Firebase sign-in account and SRA records stored under the driver profile and ride calculation paths will be deleted. This cannot be undone."
            : "No SRA driver profile or ride records were found for this account. If you continue, its Firebase Authentication account will still be permanently deleted."} Other app storage paths must also be included if the Android app stores data elsewhere. This does not affect your Google account or inDrive account.</div>
          <p className="muted">Verified account: {user.email || user.displayName || "Google account"}</p>
          <label className="delete-acknowledge"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> I understand this action is permanent and want to delete my SRA account.</label>
          <div className="delete-actions">
            <button className="danger" type="button" onClick={deleteAccount} disabled={busy || !acknowledged}>Delete my account</button>
            <button className="secondary" type="button" onClick={cancel} disabled={busy}>Cancel and sign out</button>
          </div>
        </section>}

        {stage === "complete" && <section className="delete-card"><h2>Deletion complete</h2><p className="muted">Your SRA account deletion has completed.</p><Link href="/">Return to Smart Ride Advisor</Link></section>}
      </main>
      <footer><div className="container"><Link href="/delete-guide">Read deletion terms</Link> · <Link href="/">Return to Smart Ride Advisor</Link></div></footer>
    </div>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.75 7.18l7.73 6C44.43 37.91 46.98 31.79 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}
