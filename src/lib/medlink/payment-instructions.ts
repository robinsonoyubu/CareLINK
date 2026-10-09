/** Where the booker sends a Bank Transfer / Transfer Payment. */
export interface PaymentInstructions {
  payee: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  narration: string;
}

export function paymentInstructions(
  booking: { kind: string; reference: string },
  provider: { name: string; bank_name: string | null; bank_account_name: string | null; bank_account_number: string | null } | null
): PaymentInstructions {
  // Professional-care requests are paid to RGH; everything else to the provider.
  if (booking.kind === "professional_care" || !provider) {
    return {
      payee: "RGH",
      bank_name: process.env.RGH_BANK_NAME ?? null,
      account_name: process.env.RGH_BANK_ACCOUNT_NAME ?? null,
      account_number: process.env.RGH_BANK_ACCOUNT_NUMBER ?? null,
      narration: booking.reference,
    };
  }
  return {
    payee: provider.name,
    bank_name: provider.bank_name,
    account_name: provider.bank_account_name,
    account_number: provider.bank_account_number,
    narration: booking.reference,
  };
}
