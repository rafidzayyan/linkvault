"use client";

import { useEffect, useRef, useState } from "react";
import { useLinkVault } from "@/lib/store";
import type { AccessLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconChevronDown, IconCheck, IconLogout } from "./ui/Icons";

const accessLabel: Record<AccessLevel, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

export function VaultSwitcher() {
  const { vaults, activeVaultId, setActiveVault, user, signOut } = useLinkVault();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = vaults.find((v) => v.id === activeVaultId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[11rem] items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-sm transition hover:bg-muted-bg sm:max-w-[16rem]"
      >
        <span className="truncate font-medium">{active?.name ?? "Vault"}</span>
        {active && active.access !== "owner" && (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {accessLabel[active.access]}
          </span>
        )}
        <IconChevronDown width={14} height={14} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="max-h-72 overflow-y-auto p-1">
            {vaults.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setActiveVault(v.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted-bg",
                  v.id === activeVaultId && "bg-muted-bg",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{v.name}</span>
                <span className="shrink-0 text-[11px] text-muted">{accessLabel[v.access]}</span>
                {v.id === activeVaultId && (
                  <IconCheck width={14} height={14} className="shrink-0 text-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-border p-2">
            <div className="px-2 pb-2 pt-1">
              <p className="truncate text-xs font-medium">{user?.name}</p>
              <p className="truncate text-[11px] text-muted">{user?.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-muted-bg hover:text-foreground"
            >
              <IconLogout width={16} height={16} /> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
