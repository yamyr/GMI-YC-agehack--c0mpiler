import { STAND_IN_LABELS } from "../copy";
import type { MeetingsPort } from "../ports";

/**
 * Stand-in meetings: a stable placeholder address per session under `.example`, a domain
 * reserved so it can never be a real site. Nothing is created anywhere.
 */
export function makeStandInMeetings(): MeetingsPort {
  return {
    status: { service: "meetings", connected: false, label: STAND_IN_LABELS.meetings },
    async createLink(sessionId) {
      return { url: `https://meet.agely.example/${encodeURIComponent(sessionId)}`, provider: "Stand-in meeting", standIn: true };
    },
  };
}
