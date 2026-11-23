import { z } from 'zod';

export const MOBILE_REGEX = /^[6-9]\d{9}$/;

export const optionalMobileSchema = z
  .string()
  .refine((val) => !val || MOBILE_REGEX.test(val), {
    message: 'validation.mobileInvalid',
  });

export const loginSchema = z.object({
  username: z.string().min(1, 'validation.usernameRequired'),
  password: z.string().min(1, 'validation.passwordRequired'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const categorySchema = z.object({
  code: z.string().min(1, 'validation.codeRequired').max(10),
  name: z.string().min(1, 'validation.nameRequired'),
  price: z.number().min(0, 'validation.priceMin'),
  priceIncludesGst: z.boolean(),
  ageRule: z.string(),
  isFree: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;

export const taxSettingsSchema = z.object({
  gstEnabled: z.boolean(),
  gstRate: z.number().min(0, 'validation.gstRateRange').max(100, 'validation.gstRateRange'),
  splitType: z.enum(['CGST_SGST', 'IGST']),
  pricingMode: z.enum(['INCLUSIVE', 'EXCLUSIVE']),
  gstin: z.string(),
  sacCode: z.string(),
  roundOff: z.boolean(),
});
export type TaxSettingsFormValues = z.infer<typeof taxSettingsSchema>;

export const counterSchema = z.object({
  code: z.string().min(1, 'validation.codeRequired'),
  name: z.string().min(1, 'validation.nameRequired'),
  location: z.string(),
  allowedPaymentModes: z.array(z.enum(['CASH', 'UPI', 'UPI_MANUAL'])).min(1, 'validation.paymentModeRequired'),
  ticketPrefix: z.string().min(1, 'validation.prefixRequired'),
  active: z.boolean(),
});
export type CounterFormValues = z.infer<typeof counterSchema>;

export const userSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  username: z.string().min(3, 'validation.usernameMin'),
  password: z.string().min(4, 'validation.passwordMin'),
  mobile: optionalMobileSchema,
  email: z.string().email('validation.emailInvalid').or(z.literal('')),
  counterIds: z.array(z.string()),
  active: z.boolean(),
});
export type UserFormValues = z.infer<typeof userSchema>;

export const assignExistingSubAdminSchema = z.object({
  userId: z.string().min(1, 'validation.subAdminRequired'),
});
export type AssignExistingSubAdminFormValues = z.infer<typeof assignExistingSubAdminSchema>;

export const assignSubAdminToEventSchema = z.object({
  eventId: z.string().min(1, 'validation.eventRequired'),
  counterId: z.string().min(1, 'validation.counterRequired'),
});
export type AssignSubAdminToEventFormValues = z.infer<typeof assignSubAdminToEventSchema>;

export const createCounterEmployeeSchema = z.object({
  name: z.string().min(1, 'validation.subAdminNameRequired'),
  username: z.string().min(3, 'validation.usernameMin'),
  password: z.string().min(4, 'validation.passwordMin'),
  mobile: optionalMobileSchema,
  email: z.string().email('validation.emailInvalid').or(z.literal('')),
  eventId: z.string(),
  counterId: z.string(),
  active: z.boolean(),
});
export type CreateCounterEmployeeFormValues = z.infer<typeof createCounterEmployeeSchema>;

export const subAdminManagerSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  username: z.string().min(3, 'validation.usernameMin'),
  password: z.string().min(4, 'validation.passwordMin'),
  mobile: optionalMobileSchema,
  email: z.string().email('validation.emailInvalid').or(z.literal('')),
  active: z.boolean(),
});
export type SubAdminManagerFormValues = z.infer<typeof subAdminManagerSchema>;

export const subAdminSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  mobile: optionalMobileSchema,
  email: z.string().email('validation.emailInvalid').or(z.literal('')),
  active: z.boolean(),
});
export type SubAdminFormValues = z.infer<typeof subAdminSchema>;

export const counterWithSubAdminSchema = z.object({
  code: z.string().min(1, 'validation.counterCodeRequired'),
  name: z.string().min(1, 'validation.counterNameRequired'),
  location: z.string(),
  allowedPaymentModes: z.array(z.enum(['CASH', 'UPI', 'UPI_MANUAL'])).min(1, 'validation.paymentModeRequired'),
  ticketPrefix: z.string().min(1, 'validation.prefixRequired'),
  subAdminName: z.string().min(1, 'validation.subAdminNameRequired'),
  subAdminUsername: z.string().min(3, 'validation.usernameMin'),
  subAdminPassword: z.string().min(4, 'validation.passwordMin'),
  subAdminMobile: optionalMobileSchema,
  subAdminEmail: z.string().email('validation.emailInvalid').or(z.literal('')),
});
export type CounterWithSubAdminFormValues = z.infer<typeof counterWithSubAdminSchema>;

export const counterWithExistingSubAdminSchema = z.object({
  code: z.string().min(1, 'validation.counterCodeRequired'),
  name: z.string().min(1, 'validation.counterNameRequired'),
  location: z.string(),
  allowedPaymentModes: z.array(z.enum(['CASH', 'UPI', 'UPI_MANUAL'])).min(1, 'validation.paymentModeRequired'),
  ticketPrefix: z.string().min(1, 'validation.prefixRequired'),
  existingSubAdminId: z.string().min(1, 'validation.subAdminRequired'),
});
export type CounterWithExistingSubAdminFormValues = z.infer<typeof counterWithExistingSubAdminSchema>;

export const eventSchema = z
  .object({
    name: z.string().min(1, 'validation.eventNameRequired'),
    venue: z.string(),
    city: z.string().min(1, 'validation.cityRequired'),
    dateFrom: z.string().min(1, 'validation.startDateRequired'),
    dateTo: z.string().min(1, 'validation.endDateRequired'),
    timingsStart: z.string(),
    timingsEnd: z.string(),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message: 'validation.endDateBeforeStart',
    path: ['dateTo'],
  });
export type EventFormValues = z.infer<typeof eventSchema>;

export const generalSettingsSchema = z.object({
  logoUrl: z.string(),
  footerText: z.string(),
  ticketValiditySameDayOnly: z.boolean(),
  defaultPrinterSize: z.enum(['58mm', '80mm', 'A5', 'A4']),
});
export type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

export const visitorMobileSchema = optionalMobileSchema;
