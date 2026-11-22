import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SEED_STORES } from "@/lib/data/seed-stores";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import { StoreDetailClient } from "./StoreDetailClient";

export function generateStaticParams() {
  return SEED_STORES.map((store) => ({ slug: store.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = SEED_STORES.find((s) => s.slug === slug);
  if (!store) {
    return { title: "חנות לא נמצאה", robots: { index: false, follow: false } };
  }
  const gate = evaluateStoreLegalityGate(store);

  // Spec v2 Section 16.4: Index ONLY allowed/conditional stores; prohibited/unverified = noindex!
  return {
    title: `הטבת יום הולדת ב-${store.name_he}`,
    description: `${store.benefit_summary} — בדיקת תנאי מועדון ושער חוקיות.`,
    robots: {
      index: gate.seoIndexable,
      follow: true,
    },
  };
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exists = SEED_STORES.some((s) => s.slug === slug);
  if (!exists) {
    notFound();
  }
  return <StoreDetailClient slug={slug} />;
}
