import { z } from "zod";
import { DEPARTURE_REASONS } from "@/lib/constants";

// The browser hands these over as numbers from the Geolocation API. They are
// required, not optional: a clock event without a position is exactly what this
// feature exists to prevent, so the absence is rejected here rather than stored
// as null and discovered later.
const coordinate = z.coerce.number().finite();

export const clockEventSchema = z.object({
  latitude: coordinate.min(-90, "Invalid location").max(90, "Invalid location"),
  longitude: coordinate.min(-180, "Invalid location").max(180, "Invalid location"),
  // Metres. The browser may omit it, and a negative figure is meaningless.
  accuracy: z.coerce.number().finite().min(0).optional().nullable(),
  departureReason: z.enum(DEPARTURE_REASONS).optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
});
export type ClockEventInput = z.infer<typeof clockEventSchema>;
