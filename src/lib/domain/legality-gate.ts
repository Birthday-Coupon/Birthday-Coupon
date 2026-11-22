import type { LegalityStatus, Store } from "@/lib/types";

export interface StoreGateDecision {
  canListBenefits: boolean;
  canAcceptRequests: boolean;
  requiresConditionsBanner: boolean;
  seoIndexable: boolean;
  labelHe: string;
  explanationHe: string;
}

/**
 * Legality Gate (Spec v2 Section 3 & Section 16.4)
 * Default rule: Ambiguity or missing review equals PROHIBITED.
 */
export function evaluateStoreLegalityGate(
  store: Pick<Store, "legality_status" | "takedown_requested" | "legality_conditions">
): StoreGateDecision {
  if (store.takedown_requested) {
    return {
      canListBenefits: false,
      canAcceptRequests: false,
      requiresConditionsBanner: true,
      seoIndexable: false,
      labelHe: "הוסרה לבקשת החנות",
      explanationHe: "החנות ביקשה להסיר את הצגת ההטבות באתר ואינה זמינה לבקשות.",
    };
  }

  switch (store.legality_status) {
    case "allowed":
      return {
        canListBenefits: true,
        canAcceptRequests: true,
        requiresConditionsBanner: false,
        seoIndexable: true,
        labelHe: "מותר לבקשות",
        explanationHe:
          store.legality_conditions ??
          "תקנון המועדון נבדק ומאפשר רכישה עצמאית מהחשבון האישי עם משלוח לכתובת בישראל.",
      };
    case "conditional":
      return {
        canListBenefits: true,
        canAcceptRequests: true,
        requiresConditionsBanner: true,
        seoIndexable: true,
        labelHe: "מותר בתנאים",
        explanationHe:
          store.legality_conditions ??
          "מותר בתנאים מוגדרים: בעל ההטבה מבצע את הרכישה בעצמו בחשבונו בלבד ללא העברת קוד.",
      };
    case "prohibited":
      return {
        canListBenefits: false,
        canAcceptRequests: false,
        requiresConditionsBanner: true,
        seoIndexable: false,
        labelHe: "מידע בלבד — ללא בקשות",
        explanationHe:
          store.legality_conditions ??
          "תנאי המועדון או אופן המימוש אינם מאפשרים שליחת בקשות באתר. עמוד זה מוצג למידע בלבד.",
      };
    case "unverified":
    default:
      return {
        canListBenefits: false,
        canAcceptRequests: false,
        requiresConditionsBanner: true,
        seoIndexable: false,
        labelHe: "בבדיקה — לא זמין לבקשות",
        explanationHe:
          store.legality_conditions ??
          "תקנון המועדון טרם אומת במלואו. בהתאם לשער החוקיות, אי-בהירות שקולה לאיסור עד השלמת הבדיקה.",
      };
  }
}

export function isLegalityStatusActionable(status: LegalityStatus, takedownRequested = false): boolean {
  if (takedownRequested) return false;
  return status === "allowed" || status === "conditional";
}
