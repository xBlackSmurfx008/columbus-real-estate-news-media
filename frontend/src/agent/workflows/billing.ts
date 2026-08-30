import type { Contract, ContractStatus, Invoice, InvoiceStatus } from "@/src/agent/types";
import {
  getBillingSnapshot,
  saveContract,
  saveInvoice,
  updateContractStatus,
  updateInvoiceStatus,
} from "@/src/agent/repositories/billing";

export function upsertContract(input: Omit<Contract, "id" | "createdAt" | "updatedAt"> & Partial<Contract>): Promise<Contract> {
  return saveContract(input);
}

export function setContractStatus(contractId: string, status: ContractStatus): Promise<Contract> {
  return updateContractStatus(contractId, status);
}

export function upsertInvoice(input: Omit<Invoice, "id" | "createdAt" | "updatedAt"> & Partial<Invoice>): Promise<Invoice> {
  return saveInvoice(input);
}

export function setInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<Invoice> {
  return updateInvoiceStatus(invoiceId, status);
}

export { getBillingSnapshot };
