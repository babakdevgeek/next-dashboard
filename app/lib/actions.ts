"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth";
const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string({ invalid_type_error: "please select a customer" }),
  amount: z.coerce
    .number()
    .gt(0, { message: "please enter an amount greater than 0" }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "please select an invoice status ",
  }),
  date: z.string(),
});

export type State = {
  error?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
const createInvoice = InvoiceSchema.omit({ id: true, date: true });

export async function createInvoices(preveState: State, formData: FormData) {
  const validateFields = createInvoice.safeParse({
    customerId: formData.get("customerId"),
    status: formData.get("status"),
    amount: formData.get("amount"),
  });
  if (!validateFields.success) {
    return {
      error: validateFields.error.flatten().fieldErrors,
      message: "Missing fields.Failed to create invoices",
    };
  }
  const { status, amount, customerId } = validateFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];
  try {
    await sql`INSERT INTO invoices (customer_id,amount,status,date)
    VALUES(${customerId} , ${amountInCents} , ${status} ,${date})`;
  } catch (error) {
    return { message: "could not create invoice" + " " + error };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

const UpdateInvoice = InvoiceSchema.omit({ date: true, id: true });
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const amountInCents = amount * 100;
  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    return { message: "couldnt update invoice" + " " + error };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE from invoices WHERE id=${id}`;
  } catch (error) {
    return { message: "couldnt delete invoice" + " " + error };
  }
  revalidatePath("/dashboard/invoices");
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", Object.fromEntries(formData));
  } catch (error) {
    if ((error as Error).message.includes("CredentialsSignin")) {
      return "CredentialSignin";
    }
    throw error;
  }
}
