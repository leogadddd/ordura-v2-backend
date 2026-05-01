import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendSuccess,
  sendError,
  sendValidationError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";
import { generateCustomerNumber } from "../../util/id-generation";

type EmergencyContactInput = {
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isPrimary?: boolean;
};

type FoodAllergyInput = {
  allergen: string;
  severity?: string;
  reaction?: string;
  notes?: string;
  isActive?: boolean;
};

interface CreateCustomerBody {
  isActive?: boolean;
  displayName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  suffix?: string;
  gender?: string;
  dateOfBirth?: string;
  occupation?: string;
  company?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  tags?: string[];
  emergencyContacts?: EmergencyContactInput[];
  foodAllergies?: FoodAllergyInput[];
}

export const createCustomer: RouteHandlerMethod = async (request, reply) => {
  try {
    const body = sanitizeInput<CreateCustomerBody>(request.body, {
      allowedFields: [
        "isActive",
        "displayName",
        "firstName",
        "lastName",
        "middleName",
        "suffix",
        "gender",
        "dateOfBirth",
        "occupation",
        "company",
        "email",
        "phone",
        "alternatePhone",
        "addressLine1",
        "addressLine2",
        "city",
        "state",
        "postalCode",
        "country",
        "notes",
        "tags",
        "emergencyContacts",
        "foodAllergies",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseBooleans: ["isActive"],
    });

    if (!body.displayName) {
      return sendValidationError(reply, {
        displayName: ["Display name is required"],
      });
    }

    const customerNumber = await generateCustomerNumber();

    const tags = Array.isArray(body.tags)
      ? body.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .slice(0, 50)
      : [];

    const emergencyContacts = Array.isArray(body.emergencyContacts)
      ? body.emergencyContacts
          .filter((c) => c && c.name)
          .slice(0, 20)
          .map((c) => ({
            name: String(c.name).trim(),
            relationship: c.relationship ? String(c.relationship).trim() : null,
            phone: c.phone ? String(c.phone).trim() : null,
            email: c.email ? String(c.email).trim() : null,
            address: c.address ? String(c.address).trim() : null,
            notes: c.notes ? String(c.notes).trim() : null,
            isPrimary: Boolean(c.isPrimary),
          }))
      : [];

    const foodAllergies = Array.isArray(body.foodAllergies)
      ? body.foodAllergies
          .filter((a) => a && a.allergen)
          .slice(0, 50)
          .map((a) => ({
            allergen: String(a.allergen).trim(),
            severity: (a.severity as any) || "UNKNOWN",
            reaction: a.reaction ? String(a.reaction).trim() : null,
            notes: a.notes ? String(a.notes).trim() : null,
            isActive: a.isActive === undefined ? true : Boolean(a.isActive),
          }))
      : [];

    const customer = await prisma.customer.create({
      data: {
        customerNumber,
        isActive: body.isActive ?? true,
        displayName: body.displayName,
        firstName: body.firstName || null,
        lastName: body.lastName || null,
        middleName: body.middleName || null,
        suffix: body.suffix || null,
        gender: (body.gender as any) || null,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        occupation: body.occupation || null,
        company: body.company || null,
        email: body.email || null,
        phone: body.phone || null,
        alternatePhone: body.alternatePhone || null,
        addressLine1: body.addressLine1 || null,
        addressLine2: body.addressLine2 || null,
        city: body.city || null,
        state: body.state || null,
        postalCode: body.postalCode || null,
        country: body.country || null,
        notes: body.notes || null,
        metrics: { create: {} },
        ...(tags.length > 0
          ? { tags: { createMany: { data: tags.map((label) => ({ label })) } } }
          : {}),
        ...(emergencyContacts.length > 0
          ? {
              emergencyContacts: {
                createMany: {
                  data: emergencyContacts,
                },
              },
            }
          : {}),
        ...(foodAllergies.length > 0
          ? { foodAllergies: { createMany: { data: foodAllergies } } }
          : {}),
      },
      include: {
        emergencyContacts: true,
        foodAllergies: true,
        tags: true,
        metrics: true,
      },
    });

    return sendSuccess(
      reply,
      {
        customer: {
          ...customer,
          metrics: customer.metrics
            ? {
                ...customer.metrics,
                lifetimeSpend: Number(customer.metrics.lifetimeSpend),
                avgOrderValue: Number(customer.metrics.avgOrderValue),
              }
            : null,
        },
      },
      "Customer created successfully",
      201,
    );
  } catch (err) {
    console.error("Create customer error:", err, {
      body: request.body,
      user: request.user,
    });
    return sendError(reply, "Failed to create customer", 500);
  }
};
