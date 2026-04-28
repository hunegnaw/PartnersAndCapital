import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  category: z.string().nullable().optional(),
});

export const ticketReplySchema = z.object({
  message: z.string().min(1, "Message is required").max(5000),
});

export const advisorInviteSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email("Invalid email address"),
  firm: z.string().max(200).optional(),
  advisorType: z.string().max(100).optional(),
  permissionLevel: z.enum([
    "DASHBOARD_ONLY",
    "DASHBOARD_AND_TAX_DOCUMENTS",
    "DASHBOARD_AND_DOCUMENTS",
    "SPECIFIC_INVESTMENT",
  ]),
  investmentId: z.string().optional(),
  accessStartAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters"),
});
