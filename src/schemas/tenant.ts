import { z } from "zod";

export const tenantSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido");

export const tenantStatusSchema = z.enum(["active", "suspended", "onboarding", "archived"]);
