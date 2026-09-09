import { Suspense } from "react";
import { VaultCatalog } from "@/app/components/vault-catalog";

export default function VaultPage() {
  return <Suspense fallback={<div className="page-wrap loading-state">Laddar arkivet …</div>}><VaultCatalog /></Suspense>;
}
