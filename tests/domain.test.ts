import { describe, expect, it } from "vitest";
import {
  canCreatePendingRequest,
  canDeleteAccount,
  isRequestChatOpen,
  validateRequestTransition,
} from "@/lib/domain/state-machine";
import {
  computeEligibilityWindow,
  isDateWithinWindow,
  resolveBirthdayForYear,
  shouldSendExpiryWarning,
  verifyMinimumAge,
} from "@/lib/domain/eligibility-window";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import {
  inspectMessageForContactDetails,
  sanitizePlainText,
} from "@/lib/domain/contact-guard";

describe("Request & Benefit State Machine (Spec v2 Section 5)", () => {
  it("accepting a pending request reserves the benefit and flags competing requests for auto-decline (Scenario 12)", () => {
    const res = validateRequestTransition({
      from: "pending",
      to: "accepted",
      actor: "owner",
    });
    expect(res.allowed).toBe(true);
    expect(res.resultingBenefitStatus).toBe("reserved");
    expect(res.autoDeclineOtherPending).toBe(true);
  });

  it("forbids buyer from accepting their own request", () => {
    const res = validateRequestTransition({
      from: "pending",
      to: "accepted",
      actor: "buyer",
    });
    expect(res.allowed).toBe(false);
  });

  it("forbids auto-completion without buyer confirmation (Section 5.3.7 & Scenario 18)", () => {
    expect(
      validateRequestTransition({ from: "purchased", to: "completed", actor: "system" }).allowed
    ).toBe(false);
    expect(
      validateRequestTransition({ from: "purchased", to: "completed", actor: "owner" }).allowed
    ).toBe(false);
    expect(
      validateRequestTransition({ from: "purchased", to: "completed", actor: "buyer" }).allowed
    ).toBe(true);
  });

  it("forbids cancelling after purchased — requires opening a dispute (Section 5.3.3)", () => {
    expect(
      validateRequestTransition({ from: "purchased", to: "cancelled", actor: "buyer" }).allowed
    ).toBe(false);
    expect(
      validateRequestTransition({ from: "purchased", to: "disputed", actor: "buyer" }).allowed
    ).toBe(true);
  });

  it("returns benefit to active when accepted request is cancelled within open window", () => {
    const res = validateRequestTransition({
      from: "accepted",
      to: "cancelled",
      actor: "buyer",
      benefitWindowStillOpen: true,
    });
    expect(res.allowed).toBe(true);
    expect(res.resultingBenefitStatus).toBe("active");
  });

  it("marks benefit expired when accepted request is cancelled after window ended", () => {
    const res = validateRequestTransition({
      from: "accepted",
      to: "cancelled",
      actor: "owner",
      benefitWindowStillOpen: false,
    });
    expect(res.allowed).toBe(true);
    expect(res.resultingBenefitStatus).toBe("expired");
  });

  it("allows only admin to resolve disputes", () => {
    expect(
      validateRequestTransition({ from: "disputed", to: "resolved_completed", actor: "owner" }).allowed
    ).toBe(false);
    const adminRes = validateRequestTransition({
      from: "disputed",
      to: "resolved_completed",
      actor: "admin",
    });
    expect(adminRes.allowed).toBe(true);
    expect(adminRes.resultingBenefitStatus).toBe("redeemed");
  });

  it("enforces max 3 concurrent pending requests and 10-minute new-account cooling period", () => {
    expect(
      canCreatePendingRequest({
        benefitStatus: "active",
        existingPendingCount: 3,
        buyerId: "u1",
        ownerId: "u2",
        accountAgeHours: 1,
      }).allowed
    ).toBe(false);

    expect(
      canCreatePendingRequest({
        benefitStatus: "active",
        existingPendingCount: 0,
        buyerId: "u1",
        ownerId: "u2",
        accountAgeHours: 5 / 60, // 5 minutes
      }).allowed
    ).toBe(false);

    expect(
      canCreatePendingRequest({
        benefitStatus: "active",
        existingPendingCount: 2,
        buyerId: "u1",
        ownerId: "u2",
        accountAgeHours: 15 / 60, // 15 minutes
      }).allowed
    ).toBe(true);
  });

  it("blocks account deletion while active or disputed requests exist (Scenario 20)", () => {
    expect(canDeleteAccount(["completed", "cancelled"]).allowed).toBe(true);
    expect(canDeleteAccount(["accepted"]).allowed).toBe(false);
    expect(canDeleteAccount(["purchased"]).allowed).toBe(false);
    expect(canDeleteAccount(["disputed"]).allowed).toBe(false);
  });

  it("opens chat only after accepted and closes 30 days after completion (Section 9)", () => {
    expect(isRequestChatOpen({ status: "pending", completedAt: null }).open).toBe(false);
    expect(isRequestChatOpen({ status: "accepted", completedAt: null }).open).toBe(true);
    expect(
      isRequestChatOpen({
        status: "completed",
        completedAt: "2026-01-01T00:00:00Z",
        now: new Date("2026-02-15T00:00:00Z"),
      }).open
    ).toBe(false);
  });
});

describe("Eligibility Windows & 18+ Age Gate (Spec v2 Section 6 & Scenarios 15, 16)", () => {
  it("resolves Feb 29 to Feb 28 in non-leap years and keeps Feb 29 in leap years (Scenario 16)", () => {
    expect(resolveBirthdayForYear(2, 29, 2026)).toBe("2026-02-28");
    expect(resolveBirthdayForYear(2, 29, 2028)).toBe("2028-02-29");
  });

  it("computes cross-year Dec–Jan windows accurately (Section 6.4)", () => {
    const win = computeEligibilityWindow({
      birthMonth: 12,
      birthDay: 28,
      referenceYear: 2026,
      windowType: "days_around",
      daysBefore: 5,
      daysAfter: 10,
    });
    expect(win.startDate).toBe("2026-12-23");
    expect(win.endDate).toBe("2027-01-07");
    expect(isDateWithinWindow(win.startDate, win.endDate, "2027-01-02")).toBe(true);
  });

  it("triggers 7-day expiry warning only within 0..7 days before end", () => {
    expect(shouldSendExpiryWarning("2026-11-29", "2026-11-22")).toBe(true);
    expect(shouldSendExpiryWarning("2026-12-05", "2026-11-22")).toBe(false);
    expect(shouldSendExpiryWarning("2026-11-20", "2026-11-22")).toBe(false);
  });

  it("blocks 17-year-old registration and allows 18-year-old (Scenario 15)", () => {
    expect(verifyMinimumAge("2009-05-01", "2026-11-22").valid).toBe(false);
    expect(verifyMinimumAge("2008-11-22", "2026-11-22").valid).toBe(true);
    expect(verifyMinimumAge("2008-11-23", "2026-11-22").valid).toBe(false);
  });
});

describe("Legality Gate & Security Guards (Spec v2 Section 3, 9, 14.3, Scenarios 11 & 22)", () => {
  it("treats prohibited and unverified stores as informational-only with noindex (Scenario 11)", () => {
    const prohibited = evaluateStoreLegalityGate({
      legality_status: "prohibited",
      takedown_requested: false,
      legality_conditions: null,
    });
    expect(prohibited.canAcceptRequests).toBe(false);
    expect(prohibited.seoIndexable).toBe(false);

    const unverified = evaluateStoreLegalityGate({
      legality_status: "unverified",
      takedown_requested: false,
      legality_conditions: null,
    });
    expect(unverified.canAcceptRequests).toBe(false);
    expect(unverified.seoIndexable).toBe(false);
  });

  it("immediately disables even an allowed store when takedown_requested is true (Scenario 22)", () => {
    const decision = evaluateStoreLegalityGate({
      legality_status: "allowed",
      takedown_requested: true,
      legality_conditions: null,
    });
    expect(decision.canListBenefits).toBe(false);
    expect(decision.canAcceptRequests).toBe(false);
    expect(decision.seoIndexable).toBe(false);
  });

  it("warns on off-platform phone/email/whatsapp and sanitizes HTML tags", () => {
    expect(inspectMessageForContactDetails("תתקשר אלי 054-1234567").hasContactInfo).toBe(true);
    expect(inspectMessageForContactDetails("נתאם כתובת למשלוח בערב").hasContactInfo).toBe(false);
    expect(sanitizePlainText("<script>alert(1)</script>שלום")).toBe("alert(1)שלום");
  });
});
