/**
 * Standard API envelope: { ok: true, data } | { ok: false, error: { message, code } }.
 * Docs: docs/02-architecture.md.
 */

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = {
  ok: false;
  error: { message: string; code?: string };
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data } satisfies ApiSuccess<T>, init);
}

export function err(
  message: string,
  code?: string,
  status = 400,
): Response {
  return Response.json(
    { ok: false, error: { message, code } } satisfies ApiError,
    { status },
  );
}

/** Wrap a handler so thrown Errors become Persian-shaped envelopes. */
export function handleError(error: unknown): Response {
  if (error instanceof ApiError_) {
    return err(error.message, error.code, error.status);
  }
  const message =
    error instanceof Error ? error.message : "خطای ناشناخته رخ کرد.";
  return err(message, "INTERNAL_ERROR", 500);
}

export class ApiError_ extends Error {
  code?: string;
  status: number;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const PersianErrors = {
  unauthorized: () => new ApiError_("دسترسی غیرمجاز است.", 401, "UNAUTHORIZED"),
  forbidden: () => new ApiError_("شما اجازه انجام این عمل را ندارید.", 403, "FORBIDDEN"),
  notFound: (what = "رکورد") =>
    new ApiError_(`${what} مورد نظر یافت نشد.`, 404, "NOT_FOUND"),
  invalidInput: () => new ApiError_("ورودی‌ها نامعتبر است.", 422, "INVALID_INPUT"),
  installmentExceedsDebt: () =>
    new ApiError_(
      "این مبلغ بیشتر از بدهی کارفرما است. باید از مبلغ یک قسط یا چک کم کنید.",
      400,
      "INSTALLMENT_EXCEEDS_DEBT",
    ),
  sharesMustEqual100: (current: number) =>
    new ApiError_(
      `مجموع درصد سهم‌ها باید دقیقاً ۱۰۰ باشد. در حال حاضر ${current} است.`,
      400,
      "SHARES_MUST_EQUAL_100",
    ),
  employeePaymentExceedsShare: () =>
    new ApiError_(
      "این مبلغ بیشتر از مانده سهم این کارمند در این پروژه است.",
      400,
      "PAYMENT_EXCEEDS_SHARE",
    ),
  /** Phase 3: employer payment larger than the client's outstanding debt. */
  paymentExceedsDebt: (remainingToman: string) =>
    new ApiError_(
      `مبلغ پرداختی بیشتر از بدهی باقی‌مانده کارفرما (${remainingToman} تومان) است.`,
      400,
      "PAYMENT_EXCEEDS_DEBT",
    ),
  /** Phase 3: installment plan would exceed the client's outstanding debt. */
  installmentsExceedDebt: (remainingToman: string) =>
    new ApiError_(
      `مجموع اقساط نمی‌تواند از بدهی باقی‌مانده کارفرما (${remainingToman} تومان) بیشتر باشد. برای افزایش این قسط، ابتدا از مبلغ یک قسط دیگر کم کنید.`,
      400,
      "INSTALLMENTS_EXCEEDS_DEBT",
    ),
  /** Phase 3: partial payment larger than the installment's remaining amount. */
  paymentExceedsInstallmentRemaining: () =>
    new ApiError_("مبلغ پرداختی بیشتر از مانده قسط است.", 400, "PAYMENT_EXCEEDS_INSTALLMENT"),
  /** Phase 3: deleting an installment that already carries partial payments. */
  installmentHasPartialPayment: () =>
    new ApiError_(
      "این قسط پرداخت جزئی دارد و قابل حذف نیست. ابتدا پرداخت‌های ثبت‌شده را حذف کنید.",
      400,
      "INSTALLMENT_HAS_PARTIAL_PAYMENT",
    ),
  /** Phase 3: new installment amount lower than what was already paid. */
  installmentAmountBelowPaid: () =>
    new ApiError_(
      "مبلغ قسط نمی‌تواند کمتر از مبلغ پرداخت‌شده آن باشد.",
      400,
      "INSTALLMENT_AMOUNT_BELOW_PAID",
    ),
  /** Phase 4: paying an employee who is not assigned to the project. */
  employeeNotAssigned: () =>
    new ApiError_("این کارمند به این پروژه اختصاص داده نشده است.", 400, "EMPLOYEE_NOT_ASSIGNED"),
  /** Phase 4: employee payment larger than their remaining share on a project. */
  employeePaymentExceedsBalance: (remainingToman: string) =>
    new ApiError_(
      `مبلغ پرداختی بیشتر از مانده حساب کارمند در این پروژه (${remainingToman} تومان) است.`,
      400,
      "EMPLOYEE_PAYMENT_EXCEEDS_BALANCE",
    ),
  /** Phase 3: generic 400 for a request the service rejects outright. */
  badRequest: (message = "درخواست نامعتبر است.") =>
    new ApiError_(message, 400, "BAD_REQUEST"),
} as const;
