import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  role: z.enum(["user", "agency_owner", "client"]).optional().default("user"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyOTPSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  type: z.enum(["email_verification", "login", "password_reset"]),
});

export const requestOTPSchema = z.object({
  email: z.string().email(),
  type: z.enum(["email_verification", "login", "password_reset"]),
});

export const verifyEmailTokenSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  bio: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  companyName: z.string().max(255).optional(),
  jobTitle: z.string().max(255).optional(),
  website: z.string().max(500).optional(),
  avatarUrl: z.string().optional(),
  timezone: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "agency_owner", "agency_team_member", "client", "admin", "super_admin"]),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).optional(),
});
