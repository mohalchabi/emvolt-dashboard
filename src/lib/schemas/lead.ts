import { z } from "zod";
import { LEAD_SOURCES, TRAINING_TYPES, SECTIONS, LEAD_STATUSES, LOST_REASONS } from "@/lib/constants";

export const createLeadSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(6, "Phone is required"),
  source: z.enum(LEAD_SOURCES),
  interestedIn: z.enum(TRAINING_TYPES),
  section: z.enum(SECTIONS),
  assignedStaffId: z.string().optional().nullable(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadStatusSchema = z.object({
  leadId: z.string(),
  status: z.enum(LEAD_STATUSES),
  lostReason: z.enum(LOST_REASONS).optional().nullable(),
});
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

export const assignLeadSchema = z.object({
  leadId: z.string(),
  assignedStaffId: z.string().nullable(),
});

export const updateLeadSectionSchema = z.object({
  leadId: z.string(),
  section: z.enum(SECTIONS),
});

export const addNoteSchema = z.object({
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  text: z.string().min(1, "Note can't be empty"),
});

export const sendLeadCampaignSchema = z.object({
  leadIds: z.array(z.string()).min(1, "Select at least one lead"),
  message: z.string().min(1, "Message can't be empty"),
});
export type SendLeadCampaignInput = z.infer<typeof sendLeadCampaignSchema>;
