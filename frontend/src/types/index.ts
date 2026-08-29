export interface Sender {
  id: string;
  name: string;
  email: string;
}

export interface ScheduledEmailRow {
  id: string;
  recipient: string;
  subject: string;
  scheduledAt: string;
  sentAt: string | null;
  status: "PENDING" | "SCHEDULED" | "RATE_DELAYED" | "SENT" | "FAILED";
  sender: Sender;
  failReason?: string | null;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export interface Stats {
  sentToday: number;
  scheduled: number;
  failed: number;
}
