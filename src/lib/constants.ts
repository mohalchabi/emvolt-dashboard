export const STAFF_ROLES = ["admin", "trainer", "front_desk"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

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

export const LABELS: Record<string, string> = {
  admin: "Admin",
  trainer: "Trainer",
  front_desk: "Front Desk",
  male: "Male",
  female: "Female",
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
};

export const LABELS_AR: Record<string, string> = {
  admin: "مسؤول",
  trainer: "مدرب",
  front_desk: "استقبال",
  male: "رجال",
  female: "سيدات",
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
};

export function label(value: string, locale: "en" | "ar" = "en"): string {
  const dict = locale === "ar" ? LABELS_AR : LABELS;
  return dict[value] ?? value;
}
