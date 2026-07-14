"use client";

import { useEffect, useState } from "react";
import { useLinkVault } from "@/lib/store";
import { IconLink, IconX, IconDownload, IconCheck } from "./ui/Icons";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, signInWithEmail } = useLinkVault();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
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

          {sentTo ? (
            <div className="mt-6 rounded-lg border border-border bg-background p-4 text-sm">
              <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <IconCheck width={20} height={20} />
              </span>
              <p className="font-medium">Cek email kamu</p>
              <p className="mt-1 text-muted">
                Kami kirim link masuk ke <strong>{sentTo}</strong>. Buka email itu dan klik linknya
                untuk masuk. (Cek folder spam bila belum muncul.)
              </p>
              <button
                onClick={() => {
                  setSentTo(null);
                  setEmail("");
                }}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Pakai email lain
              </button>
            </div>
          ) : (
            <>
              {authError && (
                <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                  Link login tidak valid atau kedaluwarsa. Kirim ulang.
                </p>
              )}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setFormError("");
                  setSending(true);
                  const err = await signInWithEmail(email);
                  setSending(false);
                  if (err) setFormError(err);
                  else setSentTo(email.trim().toLowerCase());
                }}
                className="mt-6 space-y-2 text-left"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@gmail.com"
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
                >
                  {sending ? "Mengirim…" : "Kirim link masuk"}
                </button>
                {formError && <p className="text-xs text-danger">{formError}</p>}
              </form>
              <p className="mt-3 text-xs text-muted">
                Tanpa password. Kami kirim link aman ke emailmu untuk masuk.
              </p>
            </>
          )}
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
          <li>
            Isi Environment Variables (URL + anon key) di Vercel, atau salin{" "}
            <code className="rounded bg-muted-bg px-1.5 py-0.5 text-xs">.env.local.example</code>{" "}
            menjadi <code className="rounded bg-muted-bg px-1.5 py-0.5 text-xs">.env.local</code> untuk
            lokal. Login pakai email (magic link) — tak perlu setup Google.
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted">Detail lengkap ada di README.md.</p>
      </div>
    </div>
  );
}
