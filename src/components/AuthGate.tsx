"use client";

import { useEffect, useState } from "react";
import { useLinkVault } from "@/lib/store";
import { IconLink, IconX, IconDownload } from "./ui/Icons";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, signInWithGoogle } = useLinkVault();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_error")) {
      setAuthError(true);
      // bersihkan query dari URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted">
        Memuat LinkVault…
      </div>
    );
  }

  if (status === "no-config") return <SetupScreen />;

  if (status === "signed-out") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-fg">
            <IconLink width={26} height={26} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">LinkVault</h1>
          <p className="mt-1 text-sm text-muted">
            Simpan & organisir link, bagikan ke tim seperti Google Sheets.
          </p>

          {authError && (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
              Login gagal atau dibatalkan. Coba lagi.
            </p>
          )}

          <button
            onClick={async () => {
              setSigningIn(true);
              await signInWithGoogle();
            }}
            disabled={signingIn}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-muted-bg disabled:opacity-60"
          >
            <GoogleIcon />
            {signingIn ? "Mengalihkan…" : "Masuk dengan Google"}
          </button>
        </div>
      </div>
    );
  }

  // status === "ready"
  return (
    <>
      <LegacyImportBanner />
      <ErrorToast />
      {children}
    </>
  );
}

function LegacyImportBanner() {
  const { legacyCount, canEdit, importLegacy, dismissLegacy } = useLinkVault();
  const [busy, setBusy] = useState(false);
  if (legacyCount <= 0 || !canEdit) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-border bg-primary/10 px-4 py-2.5 text-sm">
      <IconDownload width={16} height={16} className="text-primary" />
      <span>
        Ditemukan <strong>{legacyCount}</strong> link lama di browser ini. Pindahkan ke vault cloud-mu?
      </span>
      <button
        onClick={async () => {
          setBusy(true);
          await importLegacy();
          setBusy(false);
        }}
        disabled={busy}
        className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
      >
        {busy ? "Mengimpor…" : "Impor sekarang"}
      </button>
      <button
        onClick={dismissLegacy}
        className="rounded-lg border border-border px-3 py-1 text-xs font-medium transition hover:bg-muted-bg"
      >
        Abaikan
      </button>
    </div>
  );
}

function ErrorToast() {
  const { errorMsg, clearError } = useLinkVault();
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(clearError, 6000);
    return () => clearTimeout(t);
  }, [errorMsg, clearError]);
  if (!errorMsg) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border border-danger/40 bg-card px-4 py-2.5 text-sm shadow-lg">
      <span className="text-danger">{errorMsg}</span>
      <button onClick={clearError} className="text-muted hover:text-foreground" aria-label="Tutup">
        <IconX width={16} height={16} />
      </button>
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Setup LinkVault Cloud</h1>
        <p className="mt-2 text-sm text-muted">
          Variabel environment Supabase belum diisi. Lengkapi langkah berikut lalu jalankan ulang
          <code className="mx-1 rounded bg-muted-bg px-1.5 py-0.5 text-xs">npm run dev</code>:
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>Buat project di <strong>supabase.com</strong> (gratis).</li>
          <li>
            Jalankan <code className="rounded bg-muted-bg px-1.5 py-0.5 text-xs">supabase/schema.sql</code>{" "}
            di SQL Editor Supabase.
          </li>
          <li>Aktifkan Google Provider di Authentication → Providers.</li>
          <li>
            Salin <code className="rounded bg-muted-bg px-1.5 py-0.5 text-xs">.env.local.example</code>{" "}
            menjadi <code className="rounded bg-muted-bg px-1.5 py-0.5 text-xs">.env.local</code> dan isi
            URL + anon key.
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted">Detail lengkap ada di README.md.</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
