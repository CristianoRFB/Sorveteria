import { z } from "zod";

const optionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  priceDeltaCents: z.number().int().min(0).max(100_000),
  available: z.boolean(),
});

const optionGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  required: z.boolean(),
  minSelections: z.number().int().min(0).max(20),
  maxSelections: z.number().int().min(0).max(20),
  options: z.array(optionSchema).max(100),
}).refine((group) => group.minSelections <= group.maxSelections, {
  message: "O mínimo não pode superar o máximo.",
  path: ["maxSelections"],
}).refine((group) => group.maxSelections <= group.options.length, {
  message: "O máximo não pode superar a quantidade de opções.",
  path: ["maxSelections"],
}).refine((group) => !group.required || group.minSelections > 0, {
  message: "Uma escolha obrigatória precisa ter mínimo maior que zero.",
  path: ["minSelections"],
});

export const catalogCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const catalogProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1_000).default(""),
  categoryId: z.string().min(1),
  kind: z.enum(["pot", "cone", "milkshake", "other"]),
  priceCents: z.number().int().min(0).max(1_000_000),
  available: z.boolean().default(true),
  optionGroups: z.array(optionGroupSchema).max(20).default([]),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export type CatalogCategoryInput = z.input<typeof catalogCategorySchema>;
export type CatalogProductInput = z.input<typeof catalogProductSchema>;
