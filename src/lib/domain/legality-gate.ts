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
 * Open Community Model with Full User Responsibility & Liability Disclaimer:
 * All stores (except those explicitly removed via takedown_requested) are open
 * for publishing benefits and sending requests. Store terms notes are shown
 * purely as informational warnings; users act solely at their own responsibility.
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
      explanationHe: "החנות ביקשה להסיר את הצגתה באתר ואינה זמינה לבקשות.",
    };
  }

  switch (store.legality_status) {
    case "allowed":
      return {
        canListBenefits: true,
        canAcceptRequests: true,
        requiresConditionsBanner: false,
        seoIndexable: true,
        labelHe: "תנאי מועדון נוחים",
        explanationHe:
          store.legality_conditions ??
          "לפי המידע שברשותנו ניתן לבצע הזמנה עם משלוח בישראל. האחריות המלאה לבדיקת תקנון המועדון חלה על המשתמשים בלבד.",
      };
    case "conditional":
      return {
        canListBenefits: true,
        canAcceptRequests: true,
        requiresConditionsBanner: true,
        seoIndexable: true,
        labelHe: "בכפוף לתנאי מועדון",
        explanationHe:
          store.legality_conditions ??
          "ייתכנו תנאים מוגדרים בתקנון המועדון. האתר אינו צד לעסקה ואינו אחראי — האחריות חלה על המשתמשים בלבד.",
      };
    case "prohibited":
      return {
        canListBenefits: true,
        canAcceptRequests: true,
        requiresConditionsBanner: true,
        seoIndexable: true,
        labelHe: "שימו לב: מגבלות בתקנון",
        explanationHe:
          (store.legality_conditions ? `${store.legality_conditions} ` : "") +
          "לתשומת לבך: האתר אינו חוסם תקשורת בין משתמשים אך מסיר מעצמו כל אחריות — השימוש בהטבה הוא באחריותכם הבלעדית.",
      };
    case "unverified":
    default:
      return {
        canListBenefits: true,
        canAcceptRequests: true,
        requiresConditionsBanner: true,
        seoIndexable: true,
        labelHe: "תנאים לא נבדקו",
        explanationHe:
          (store.legality_conditions ? `${store.legality_conditions} ` : "") +
          "תנאי המועדון לא נבדקו במלואם. האחריות לבדיקה ולשימוש בהטבה חלה על המשתמשים בלבד והאתר אינו אחראי לכל תוצאה.",
      };
  }
}

export function isLegalityStatusActionable(_status: LegalityStatus, takedownRequested = false): boolean {
  return !takedownRequested;
}
