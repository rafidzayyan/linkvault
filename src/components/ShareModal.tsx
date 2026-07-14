"use client";

import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { useLinkVault } from "@/lib/store";
import type { Role } from "@/lib/types";
import { IconTrash, IconUsers } from "./ui/Icons";

export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    access,
    user,
    vaults,
    activeVaultId,
    members,
    refreshMembers,
    addMember,
    updateMemberRole,
    removeMember,
  } = useLinkVault();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const vault = vaults.find((v) => v.id === activeVaultId);
  const isOwner = access === "owner";

  useEffect(() => {
    if (open) {
      refreshMembers();
      setEmail("");
      setRole("viewer");
      setError("");
    }
  }, [open, refreshMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const err = await addMember(email, role);
    setBusy(false);
    if (err) setError(err);
    else setEmail("");
  }

  const inputCls =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <Modal open={open} onClose={onClose} title={`Bagikan "${vault?.name ?? "Vault"}"`}>
      {!isOwner ? (
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <IconUsers width={16} height={16} /> Kamu punya akses sebagai{" "}
            <RoleBadge role={access === "editor" ? "editor" : "viewer"} />
          </p>
          <p className="mt-2 text-muted">
            Hanya pemilik vault yang bisa menambah atau mengubah akses. Hubungi pemilik untuk
            perubahan.
          </p>
        </div>
      ) : (
        <>
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-muted">Undang lewat email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@gmail.com"
                className={`${inputCls} w-full`}
                autoFocus
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputCls}
              aria-label="Peran"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
            >
              {busy ? "…" : "Undang"}
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}

          <div className="mt-5 space-y-1">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Orang dengan akses
            </p>

            {/* Owner (kamu) */}
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <Avatar name={user?.name ?? "?"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.name} (kamu)</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
              <span className="text-xs font-medium text-muted">Owner</span>
            </div>

            {members.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted">
                Belum ada yang diundang. Undang email di atas untuk berbagi.
              </p>
            )}

            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted-bg">
                <Avatar name={m.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{m.email}</p>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => updateMemberRole(m.id, e.target.value as Role)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                  aria-label={`Peran ${m.email}`}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  onClick={() => removeMember(m.id)}
                  className="rounded-md p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Hapus akses ${m.email}`}
                  title="Hapus akses"
                >
                  <IconTrash width={16} height={16} />
                </button>
              </div>
            ))}
          </div>

          <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
            Viewer hanya bisa melihat isi & history. Editor bisa menambah, mengubah, dan menghapus
            link.
          </p>
        </>
      )}
    </Modal>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      {role === "editor" ? "Editor" : "Viewer"}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-bg text-xs font-semibold uppercase text-muted">
      {name.charAt(0)}
    </span>
  );
}
