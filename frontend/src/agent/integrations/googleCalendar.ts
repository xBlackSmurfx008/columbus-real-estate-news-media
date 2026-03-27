import { nextId } from "@/src/agent/store";

export interface CalendarSlot {
  start: string;
  end: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  attendeeEmail: string;
  start: string;
  end: string;
  notes?: string;
}

const stagedEvents: CalendarEvent[] = [];

function buildMockSlots(baseDate = new Date()): CalendarSlot[] {
  const slots: CalendarSlot[] = [];
  for (let dayOffset = 1; dayOffset <= 3; dayOffset += 1) {
    const day = new Date(baseDate);
    day.setDate(baseDate.getDate() + dayOffset);
    [10, 13, 15].forEach((hour) => {
      const start = new Date(day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(day);
      end.setHours(hour + 1, 0, 0, 0);
      slots.push({ start: start.toISOString(), end: end.toISOString() });
    });
  }
  return slots;
}

export const googleCalendarAdapter = {
  async getAvailableSlots(): Promise<CalendarSlot[]> {
    if (process.env.GOOGLE_CALENDAR_MODE === "api") {
      // For now return generated slots in API mode too; event creation is real API-backed.
      return buildMockSlots();
    }
    return buildMockSlots();
  },

  async createEvent(input: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
    if (process.env.GOOGLE_CALENDAR_MODE === "api") {
      const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
      const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
      if (!accessToken) {
        throw new Error("GOOGLE_CALENDAR_ACCESS_TOKEN is required when GOOGLE_CALENDAR_MODE=api.");
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: input.title,
            description: input.notes || "",
            start: { dateTime: input.start },
            end: { dateTime: input.end },
            attendees: [{ email: input.attendeeEmail }],
          }),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Google Calendar create event failed (${response.status}): ${text}`);
      }
      const payload = (await response.json()) as { id: string };
      const created: CalendarEvent = { id: payload.id, ...input };
      stagedEvents.push(created);
      return created;
    }

    const event: CalendarEvent = { id: nextId("event"), ...input };
    stagedEvents.push(event);
    return event;
  },

  async listEvents(): Promise<CalendarEvent[]> {
    return stagedEvents;
  },
};
