import { NextResponse } from "next/server";
import { googleCalendarAdapter } from "@/src/agent/integrations/googleCalendar";
import { crmAdapter } from "@/src/agent/integrations/crm";

interface SchedulePayload {
  contactEmail: string;
  contactName: string;
  title: string;
  start: string;
  end: string;
  notes?: string;
}

export async function GET() {
  try {
    const slots = await googleCalendarAdapter.getAvailableSlots();
    const events = await googleCalendarAdapter.listEvents();
    return NextResponse.json({ ok: true, slots, events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SchedulePayload;
    if (!payload.contactEmail || !payload.contactName || !payload.title || !payload.start || !payload.end) {
      return NextResponse.json(
        { error: "Required fields: contactEmail, contactName, title, start, end." },
        { status: 400 },
      );
    }

    const contact = crmAdapter.upsertContact({
      email: payload.contactEmail,
      name: payload.contactName,
    });
    const event = await googleCalendarAdapter.createEvent({
      attendeeEmail: payload.contactEmail,
      title: payload.title,
      start: payload.start,
      end: payload.end,
      notes: payload.notes,
    });

    crmAdapter.addActivity({
      entityType: "contact",
      entityId: contact.id,
      contactId: contact.id,
      type: "meeting_scheduled",
      summary: `Scheduled "${payload.title}" at ${payload.start}`,
    });

    return NextResponse.json({ ok: true, event, contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
