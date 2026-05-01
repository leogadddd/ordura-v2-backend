import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendValidationError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";

interface UpdateParams {
  id: string;
}

type EmergencyContactInput = {
  id?: string;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isPrimary?: boolean;
};

type FoodAllergyInput = {
  id?: string;
  allergen: string;
  severity?: string;
  reaction?: string;
  notes?: string;
  isActive?: boolean;
};

interface UpdateCustomerBody {
  isActive?: boolean;
  displayName?: string;
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

export const updateCustomer: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as UpdateParams;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "Customer not found");

    const body = sanitizeInput<UpdateCustomerBody>(request.body, {
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
      removeEmpty: false,
      parseBooleans: ["isActive"],
    });

    if (body.displayName !== undefined && !String(body.displayName).trim()) {
      return sendValidationError(reply, {
        displayName: ["Display name cannot be empty"],
      });
    }

    const data: any = {};
    const scalarFields = [
      "isActive",
      "displayName",
      "firstName",
      "lastName",
      "middleName",
      "suffix",
      "gender",
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
    ];
    for (const f of scalarFields) {
      if ((body as any)[f] !== undefined) {
        data[f] = (body as any)[f];
      }
    }
    if (body.dateOfBirth !== undefined) {
      data.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.gender !== undefined) {
      data.gender = body.gender ? (body.gender as any) : null;
    }

    const tx: any[] = [];

    // Replace tags if provided
    if (body.tags !== undefined) {
      const tags = Array.isArray(body.tags)
        ? body.tags
            .map((t) => String(t).trim())
            .filter(Boolean)
            .slice(0, 50)
        : [];
      tx.push(
        prisma.customerTag.deleteMany({ where: { customerId: id } }) as any,
      );
      if (tags.length > 0) {
        tx.push(
          prisma.customerTag.createMany({
            data: tags.map((label) => ({ customerId: id, label })),
            skipDuplicates: true,
          }) as any,
        );
      }
    }

    // Replace emergency contacts if provided
    if (body.emergencyContacts !== undefined) {
      const contacts = Array.isArray(body.emergencyContacts)
        ? body.emergencyContacts
            .filter((c) => c && c.name)
            .slice(0, 20)
            .map((c) => ({
              customerId: id,
              name: String(c.name).trim(),
              relationship: c.relationship
                ? String(c.relationship).trim()
                : null,
              phone: c.phone ? String(c.phone).trim() : null,
              email: c.email ? String(c.email).trim() : null,
              address: c.address ? String(c.address).trim() : null,
              notes: c.notes ? String(c.notes).trim() : null,
              isPrimary: Boolean(c.isPrimary),
            }))
        : [];
      tx.push(
        prisma.customerEmergencyContact.deleteMany({
          where: { customerId: id },
        }) as any,
      );
      if (contacts.length > 0) {
        tx.push(
          prisma.customerEmergencyContact.createMany({
            data: contacts,
          }) as any,
        );
      }
    }

    // Replace food allergies if provided
    if (body.foodAllergies !== undefined) {
      const allergies = Array.isArray(body.foodAllergies)
        ? body.foodAllergies
            .filter((a) => a && a.allergen)
            .slice(0, 50)
            .map((a) => ({
              customerId: id,
              allergen: String(a.allergen).trim(),
              severity: (a.severity as any) || "UNKNOWN",
              reaction: a.reaction ? String(a.reaction).trim() : null,
              notes: a.notes ? String(a.notes).trim() : null,
              isActive: a.isActive === undefined ? true : Boolean(a.isActive),
            }))
        : [];
      tx.push(
        prisma.customerFoodAllergy.deleteMany({
          where: { customerId: id },
        }) as any,
      );
      if (allergies.length > 0) {
        tx.push(
          prisma.customerFoodAllergy.createMany({ data: allergies }) as any,
        );
      }
    }

    // Apply relation replacement ops first, then return the final updated row
    // with fresh includes.
    const results = await prisma.$transaction([
      ...tx,
      prisma.customer.update({
        where: { id },
        data,
        include: {
          emergencyContacts: true,
          foodAllergies: true,
          tags: true,
          metrics: true,
        },
      }),
    ]);

    const updated = results[results.length - 1] as any;

    return sendSuccess(reply, {
      customer: {
        ...updated,
        metrics: updated.metrics
          ? {
              ...updated.metrics,
              lifetimeSpend: Number(updated.metrics.lifetimeSpend),
              avgOrderValue: Number(updated.metrics.avgOrderValue),
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Update customer error:", err, {
      params: request.params,
      body: request.body,
      user: request.user,
    });
    return sendError(reply, "Failed to update customer", 500);
  }
};
