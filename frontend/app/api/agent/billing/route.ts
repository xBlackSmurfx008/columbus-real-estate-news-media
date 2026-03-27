import { NextResponse } from "next/server";
import { getBillingSnapshot, setContractStatus, setInvoiceStatus, upsertContract, upsertInvoice } from "@/src/agent/workflows/billing";

type BillingPayload =
  | {
      action: "upsert_contract";
      contract: {
        id?: string;
        companyId: string;
        dealId: string;
        status: "draft" | "sent" | "signed" | "cancelled";
        amount: number;
        startsOn?: string;
        endsOn?: string;
      };
    }
  | {
      action: "set_contract_status";
      contractId: string;
      status: "draft" | "sent" | "signed" | "cancelled";
    }
  | {
      action: "upsert_invoice";
      invoice: {
        id?: string;
        contractId: string;
        companyId: string;
        dealId: string;
        status: "draft" | "sent" | "paid" | "overdue";
        amount: number;
        dueAt: string;
      };
    }
  | {
      action: "set_invoice_status";
      invoiceId: string;
      status: "draft" | "sent" | "paid" | "overdue";
    };

export async function GET() {
  try {
    return NextResponse.json({ ok: true, snapshot: getBillingSnapshot() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BillingPayload;
    if (payload.action === "upsert_contract") {
      return NextResponse.json({ ok: true, contract: upsertContract(payload.contract) });
    }
    if (payload.action === "set_contract_status") {
      return NextResponse.json({
        ok: true,
        contract: setContractStatus(payload.contractId, payload.status),
      });
    }
    if (payload.action === "upsert_invoice") {
      return NextResponse.json({ ok: true, invoice: upsertInvoice(payload.invoice) });
    }
    if (payload.action === "set_invoice_status") {
      return NextResponse.json({
        ok: true,
        invoice: setInvoiceStatus(payload.invoiceId, payload.status),
      });
    }
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
