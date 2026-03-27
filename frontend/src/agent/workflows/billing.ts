import { contractsStore, invoicesStore, nextId, upsert } from "@/src/agent/store";
import type { Contract, ContractStatus, Invoice, InvoiceStatus } from "@/src/agent/types";

export function upsertContract(input: Omit<Contract, "id" | "createdAt" | "updatedAt"> & Partial<Contract>): Contract {
  const now = new Date().toISOString();
  if (input.id && contractsStore.has(input.id)) {
    const existing = contractsStore.get(input.id);
    if (!existing) throw new Error("Contract not found.");
    return upsert(contractsStore, {
      ...existing,
      ...input,
      updatedAt: now,
    });
  }
  return upsert(contractsStore, {
    id: nextId("contract"),
    companyId: input.companyId,
    dealId: input.dealId,
    status: input.status,
    amount: input.amount,
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    createdAt: now,
    updatedAt: now,
  });
}

export function setContractStatus(contractId: string, status: ContractStatus): Contract {
  const contract = contractsStore.get(contractId);
  if (!contract) throw new Error("Contract not found.");
  contract.status = status;
  contract.updatedAt = new Date().toISOString();
  return upsert(contractsStore, contract);
}

export function upsertInvoice(input: Omit<Invoice, "id" | "createdAt" | "updatedAt"> & Partial<Invoice>): Invoice {
  const now = new Date().toISOString();
  if (input.id && invoicesStore.has(input.id)) {
    const existing = invoicesStore.get(input.id);
    if (!existing) throw new Error("Invoice not found.");
    return upsert(invoicesStore, {
      ...existing,
      ...input,
      updatedAt: now,
    });
  }
  return upsert(invoicesStore, {
    id: nextId("invoice"),
    contractId: input.contractId,
    companyId: input.companyId,
    dealId: input.dealId,
    status: input.status,
    amount: input.amount,
    dueAt: input.dueAt,
    paidAt: input.paidAt,
    createdAt: now,
    updatedAt: now,
  });
}

export function setInvoiceStatus(invoiceId: string, status: InvoiceStatus): Invoice {
  const invoice = invoicesStore.get(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  invoice.status = status;
  invoice.updatedAt = new Date().toISOString();
  if (status === "paid") {
    invoice.paidAt = new Date().toISOString();
  }
  return upsert(invoicesStore, invoice);
}

export function getBillingSnapshot() {
  return {
    contracts: [...contractsStore.values()],
    invoices: [...invoicesStore.values()],
  };
}
