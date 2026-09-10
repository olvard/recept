import { Suspense } from "react";
import { VaultContent } from "@/app/components/vault-content";

export default function VaultPage() {
  return <Suspense fallback={<div className="page-wrap loading-state">Laddar arkivet …</div>}><VaultContent /></Suspense>;
}
