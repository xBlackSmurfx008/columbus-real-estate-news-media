import { getDb } from "@/lib/db";
import type { Contract, Invoice } from "@/src/agent/types";

type DbRow = Record<string, unknown>;
type ContractInput = Omit<Contract, "id" | "createdAt" | "updatedAt"> & Partial<Pick<Contract, "id" | "createdAt" | "updatedAt">>;
type InvoiceInput = Omit<Invoice, "id" | "createdAt" | "updatedAt"> & Partial<Pick<Invoice, "id" | "createdAt" | "updatedAt">>;

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function contractFromRow(row: DbRow): Contract {
  return {
    id: String(row.id), companyId: String(row.company_id), dealId: String(row.deal_id),
    status: String(row.status) as Contract["status"], amount: Number(row.amount),
    startsOn: row.starts_on ? String(row.starts_on) : undefined, endsOn: row.ends_on ? String(row.ends_on) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function invoiceFromRow(row: DbRow): Invoice {
  return {
    id: String(row.id), contractId: String(row.contract_id), companyId: String(row.company_id), dealId: String(row.deal_id),
    status: String(row.status) as Invoice["status"], amount: Number(row.amount), dueAt: new Date(String(row.due_at)).toISOString(),
    paidAt: row.paid_at ? new Date(String(row.paid_at)).toISOString() : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function saveContract(input: ContractInput): Promise<Contract> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_contracts (id, company_id, deal_id, status, amount, starts_on, ends_on, created_at, updated_at)
    VALUES (${input.id || id("contract")}, ${input.companyId}, ${input.dealId}, ${input.status}, ${input.amount}, ${input.startsOn || null}, ${input.endsOn || null}, COALESCE(${input.createdAt || null}, NOW()), NOW())
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, amount = EXCLUDED.amount, starts_on = EXCLUDED.starts_on, ends_on = EXCLUDED.ends_on, updated_at = NOW()
    RETURNING *
  `;
  return contractFromRow(rows[0] as DbRow);
}

export async function updateContractStatus(contractId: string, status: Contract["status"]): Promise<Contract> {
  const sql = getDb();
  const rows = await sql`UPDATE agent_contracts SET status = ${status}, updated_at = NOW() WHERE id = ${contractId} RETURNING *`;
  if (!rows[0]) throw new Error("Contract not found.");
  return contractFromRow(rows[0] as DbRow);
}

export async function saveInvoice(input: InvoiceInput): Promise<Invoice> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_invoices (id, contract_id, company_id, deal_id, status, amount, due_at, paid_at, created_at, updated_at)
    VALUES (${input.id || id("invoice")}, ${input.contractId}, ${input.companyId}, ${input.dealId}, ${input.status}, ${input.amount}, ${input.dueAt}, ${input.paidAt || null}, COALESCE(${input.createdAt || null}, NOW()), NOW())
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, amount = EXCLUDED.amount, due_at = EXCLUDED.due_at, paid_at = EXCLUDED.paid_at, updated_at = NOW()
    RETURNING *
  `;
  return invoiceFromRow(rows[0] as DbRow);
}

export async function updateInvoiceStatus(invoiceId: string, status: Invoice["status"]): Promise<Invoice> {
  const sql = getDb();
  const rows = await sql`UPDATE agent_invoices SET status = ${status}, paid_at = CASE WHEN ${status} = 'paid' THEN NOW() ELSE paid_at END, updated_at = NOW() WHERE id = ${invoiceId} RETURNING *`;
  if (!rows[0]) throw new Error("Invoice not found.");
  return invoiceFromRow(rows[0] as DbRow);
}

export async function getBillingSnapshot() {
  const sql = getDb();
  const [contracts, invoices] = await Promise.all([
    sql`SELECT * FROM agent_contracts ORDER BY created_at ASC`,
    sql`SELECT * FROM agent_invoices ORDER BY created_at ASC`,
  ]);
  return {
    contracts: contracts.map((row) => contractFromRow(row as DbRow)),
    invoices: invoices.map((row) => invoiceFromRow(row as DbRow)),
  };
}
