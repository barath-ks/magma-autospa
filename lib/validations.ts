import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "A valid phone number is required"), // Now mandatory
  email: z.string().email("Invalid email").optional().or(z.literal("")), // Now optional
});
