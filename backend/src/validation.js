import { z } from "zod";

export const roles = ["municipal_authority", "urban_planner", "environmental_consultant", "public_viewer", "admin"];

export const registerInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  phone: z.string().trim().min(8).max(20).optional(),
  role: z.enum(roles).optional(),
});

export const loginInput = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const refreshInput = z.object({ refreshToken: z.string().min(20) });

export const notificationInput = z.object({
  userId: z.uuid(),
  title: z.string().trim().min(2).max(140),
  message: z.string().trim().min(2).max(2000),
  channels: z.array(z.enum(["in_app", "email", "sms"])).min(1).default(["in_app"]),
});

const numberMap = z.record(z.string(), z.coerce.number().min(0)).default({});

const mlOutput = z.object({
  project_location: z.object({ lat: z.number(), lon: z.number(), buffer_m: z.number().positive() }).optional(),
  landcover: z.object({
    vegetation_pct: z.number().min(0).max(100),
    impervious_pct: z.number().min(0).max(100),
    water_pct: z.number().min(0).max(100),
  }),
  ndvi_mean: z.number().optional().default(0),
  ndbi_mean: z.number().optional().default(0),
  ndwi_mean: z.number().optional().default(0),
  lst_celsius_mean: z.number().min(-20).max(80),
  slope_deg_mean: z.number().min(0).optional().default(0),
  elevation_m_mean: z.number().optional().default(0),
}).refine((value) => {
  const { vegetation_pct, impervious_pct, water_pct } = value.landcover;
  return Math.abs(vegetation_pct + impervious_pct + water_pct - 100) <= 1;
}, { message: "Land-cover percentages must total 100 (+/- 1)", path: ["landcover"] });

export const assessmentInput = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(80),
  organization: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  location: z.string().trim().min(2).max(160),
  coordinates: z.object({
    lat: z.number().min(18).max(19),
    lon: z.number().min(73).max(75),
  }).optional(),
  bufferM: z.number().int().min(100).max(5000).optional().default(500),
  builtUpAreaSqm: z.number().positive().optional().default(10000),
  materials: numberMap,
  mlOutput: mlOutput.optional(),
});

export const reassessmentInput = z.object({
  mlOutput: mlOutput.optional(),
  materials: numberMap.optional(),
  builtUpAreaSqm: z.number().positive().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one scenario change");
