"use client";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { generateBarcodeForVariant } from "@/lib/actions/products";

export function GenerateBarcodeButton({ variantId, productId }: { variantId: string; productId: string }) {
  return (
    <ActionForm action={generateBarcodeForVariant}>
      <input type="hidden" name="id" value={variantId} />
      <input type="hidden" name="product_id" value={productId} />
      <SubmitButton variant="secondary" size="sm" pendingLabel="Génération…">Générer un code interne</SubmitButton>
    </ActionForm>
  );
}
