export const STAFF_ROLES = ["admin", "trainer_manager", "trainer", "front_desk"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Roles with studio-wide oversight: the whole client and lead list, the
 * package catalog, and petty cash.
 *
 * Deliberately not the same as "admin". The trainers manager runs the floor
 * but does not administer the business, so the wallet ledger (salaries, rent,
 * transfers) and staff administration stay admin-only. Guard sites list this
 * constant when the question is "does this person run the floor", and spell
 * out ["admin"] when the answer really is only the owner.
 */
export const MANAGER_ROLES = ["admin", "trainer_manager"] as const satisfies readonly StaffRole[];

/** Inline form of MANAGER_ROLES, for the `canManage`-style checks in pages. */
export function isManagerRole(role: string): boolean {
  return (MANAGER_ROLES as readonly string[]).includes(role);
}

// Why someone clocked out before the end of their day. Null on an ordinary
// end of shift — these are the exceptions, not a category for every clock-out.
export const DEPARTURE_REASONS = ["annual_leave", "early_leave", "field_task", "sick"] as const;
export type DepartureReason = (typeof DEPARTURE_REASONS)[number];

export const SECTIONS = ["male", "female"] as const;
export type Section = (typeof SECTIONS)[number];

export const LEAD_SOURCES = [
  "cal_com",
  "instagram",
  "walk_in",
  "referral",
  "whatsapp",
  "bulk_import",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// How a walk-in client (added directly by staff, not converted from a Lead)
// found the studio.
export const CLIENT_SOURCES = [
  "social_media",
  "website",
  "google_maps",
  "friend_or_family",
  "other",
] as const;
export type ClientSource = (typeof CLIENT_SOURCES)[number];

export const PAYMENT_METHODS = ["mada", "visa", "tabby"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const TRAINING_TYPES = ["ems", "pilates", "pt"] as const;
export type TrainingType = (typeof TRAINING_TYPES)[number];

export const SESSION_TYPES = ["trial", ...TRAINING_TYPES] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

// Fixed operating-hours baseline for the calendar grid and (later) the
// trainer-utilization KPI.
export const OPERATING_HOURS = { startHour: 9, endHour: 22 } as const;
export const CALENDAR_SLOT_MINUTES = 30;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "trial_scheduled",
  "trial_completed",
  "converted",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LOST_REASONS = [
  "price",
  "location",
  "schedule",
  "competitor",
  "no_response",
  "not_interested",
  "medical",
  "other",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const CONTACT_METHODS = ["whatsapp", "sms", "call"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const CONTACT_OUTCOMES = [
  "no_answer",
  "interested_later",
  "declined",
  "booked_trial",
] as const;
export type ContactOutcome = (typeof CONTACT_OUTCOMES)[number];

export const CLIENT_STATUSES = ["active", "paused", "churned"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const SESSION_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// What a wallet payment was for. `petty_cash` is special: it's a float handed
// to a staff member rather than a finished expense, so those rows get
// reconciled against the VAT invoices they later bring back.
export const WALLET_CATEGORIES = [
  "salary",
  "petty_cash",
  "bonus",
  "advance",
  "rent",
  "utilities",
  "equipment",
  "maintenance",
  "supplies",
  "marketing",
  "transport",
  "government_fees",
  "other",
] as const;
export type WalletCategory = (typeof WALLET_CATEGORIES)[number];

export const PETTY_CASH_CATEGORY: WalletCategory = "petty_cash";

// How a wallet payment physically left the wallet. Salaries go out both ways
// and petty cash is always cash, so this is what explains an entry that has
// no bank transfer attached to it.
export const WALLET_PAYMENT_METHODS = ["transfer", "cash"] as const;
export type WalletPaymentMethod = (typeof WALLET_PAYMENT_METHODS)[number];

export const LABELS: Record<string, string> = {
  admin: "Admin",
  trainer_manager: "Trainers Manager",
  trainer: "Trainer",
  front_desk: "Front Desk",
  male: "Male",
  female: "Female",
  annual_leave: "Annual leave",
  early_leave: "Early leave",
  field_task: "Field task",
  sick: "Sick",
  cal_com: "cal.com",
  instagram: "Instagram",
  walk_in: "Walk-in",
  referral: "Referral",
  whatsapp: "WhatsApp",
  bulk_import: "Bulk Import",
  other: "Other",
  social_media: "Social Media",
  website: "Website",
  google_maps: "Google Maps",
  friend_or_family: "Friend or Family",
  mada: "mada",
  visa: "Visa",
  tabby: "Tabby",
  ems: "EMS",
  pilates: "Pilates",
  pt: "Personal Training",
  trial: "Trial",
  new: "New",
  contacted: "Contacted",
  trial_scheduled: "Trial Scheduled",
  trial_completed: "Trial Completed",
  converted: "Converted",
  lost: "Lost",
  price: "Price too high",
  location: "Location/distance",
  schedule: "Schedule conflict",
  competitor: "Chose a competitor",
  no_response: "No response",
  not_interested: "Not interested after trial",
  medical: "Medical/health reason",
  active: "Active",
  paused: "Paused",
  churned: "Churned",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  sms: "SMS",
  call: "Call",
  no_answer: "No answer",
  interested_later: "Interested — follow up later",
  declined: "Not interested",
  booked_trial: "Booked a trial",
  contract: "Contract",
  id_document: "ID Document",
  salary: "Salary",
  petty_cash: "Petty Cash",
  bonus: "Bonus",
  advance: "Salary Advance",
  rent: "Rent",
  utilities: "Utilities",
  equipment: "Equipment",
  maintenance: "Maintenance",
  supplies: "Supplies",
  marketing: "Marketing",
  transport: "Transport",
  government_fees: "Government Fees",
  transfer: "Bank Transfer",
  cash: "Cash",
};

export const LABELS_AR: Record<string, string> = {
  admin: "مسؤول",
  trainer_manager: "مدير المدربين",
  trainer: "مدرب",
  front_desk: "استقبال",
  male: "رجال",
  female: "سيدات",
  annual_leave: "إجازة",
  early_leave: "مغادرة مبكرة",
  field_task: "مهمة خارجية",
  sick: "مرضي",
  cal_com: "cal.com",
  instagram: "انستغرام",
  walk_in: "زيارة مباشرة",
  referral: "إحالة",
  whatsapp: "واتساب",
  bulk_import: "استيراد جماعي",
  other: "أخرى",
  social_media: "وسائل التواصل الاجتماعي",
  website: "الموقع الإلكتروني",
  google_maps: "خرائط جوجل",
  friend_or_family: "صديق أو أحد أفراد العائلة",
  mada: "مدى",
  visa: "فيزا",
  tabby: "تابي",
  ems: "EMS",
  pilates: "بيلاتس",
  pt: "تدريب شخصي",
  trial: "تجربة",
  new: "جديد",
  contacted: "تم التواصل",
  trial_scheduled: "تجربة مجدولة",
  trial_completed: "تجربة مكتملة",
  converted: "تحويل ناجح",
  lost: "خسارة",
  price: "السعر مرتفع",
  location: "الموقع/المسافة",
  schedule: "تعارض في المواعيد",
  competitor: "اختار منافس",
  no_response: "لا يوجد رد",
  not_interested: "غير مهتم بعد التجربة",
  medical: "سبب صحي",
  active: "نشط",
  paused: "متوقف مؤقتاً",
  churned: "منسحب",
  scheduled: "مجدولة",
  completed: "مكتملة",
  cancelled: "ملغاة",
  no_show: "لم يحضر",
  sms: "رسالة نصية",
  call: "اتصال",
  no_answer: "لا يوجد رد",
  interested_later: "مهتم - متابعة لاحقاً",
  declined: "غير مهتم",
  booked_trial: "تم حجز تجربة",
  contract: "العقد",
  id_document: "وثيقة الهوية",
  salary: "راتب",
  petty_cash: "نثريات",
  bonus: "مكافأة",
  advance: "سلفة على الراتب",
  rent: "إيجار",
  utilities: "فواتير الخدمات",
  equipment: "معدات",
  maintenance: "صيانة",
  supplies: "مستلزمات",
  marketing: "تسويق",
  transport: "مواصلات",
  government_fees: "رسوم حكومية",
  transfer: "تحويل بنكي",
  cash: "نقداً",
};

export function label(value: string, locale: "en" | "ar" = "en"): string {
  const dict = locale === "ar" ? LABELS_AR : LABELS;
  return dict[value] ?? value;
}
