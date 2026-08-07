"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { tokenStore } from "@/lib/auth";
import {
  Briefcase,
  Cake,
  CalendarDays,
  CalendarCheck,
  CalendarMinus,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Clock3,
  FileText,
  Filter,
  Folder,
  HeartPulse,
  Link2,
  ListChecks,
  LogOut,
  Mail,
  Megaphone,
  MoreHorizontal,
  Moon,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  Star,
  Timer,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const mainTabs = ["overview", "dashboard", "calendar"];
const workTabs = [
  "Activities",
  "Feeds",
  "Profile",
  "Approvals",
  "Leave",
  "Attendance",
  "Time Logs",
  "Timesheets",
  "Jobs",
  "Files",
  "Career History",
  "Goals",
  "Feedback",
];

type OverviewData = {
  tabs: string[];
  profile: {
    employee_code: string;
    name: string;
    email: string;
    status_text: string;
    timer: string[];
    can_check_in: boolean;
    checked_in_at?: string | null;
    checked_out_at?: string | null;
    check_in_button: string;
    attendance_action: string;
  };
  shift: {
    name: string;
    start_time: string;
    end_time: string;
    display: string;
  };
  week_start: string;
  week_end: string;
  week: Array<{
    day: string;
    date: string;
    note?: string | null;
    tone: string;
    is_today: boolean;
  }>;
  activity: {
    greeting: string;
    person_name: string;
    message: string;
    reminder_title: string;
    reminder_text: string;
    time_log_message: string;
  };
  profile_details: {
    timezone: string;
    about_text: string;
    tags: string[];
  };
  time_logs: {
    projects: string[];
    jobs: string[];
    selected_billable: string;
    timer: string;
    empty_state: string;
  };
  modules: Record<string, { title: string; empty_state: string; count: number }>;
};

const weekRows = [
  { day: "Sun", date: "14", note: "Weekend", tone: "bg-amber-50 text-amber-600" },
  { day: "Mon", date: "15", note: "Absent", tone: "text-red-500" },
  { day: "Tue", date: "16", note: "", tone: "" },
  { day: "Wed", date: "17", note: "", tone: "" },
  { day: "Thu", date: "18", note: "", tone: "" },
  { day: "Fri", date: "19", note: "", tone: "" },
  { day: "Sat", date: "20", note: "Weekend", tone: "bg-amber-50 text-amber-600" },
];

const newHires = [
  {
    id: "S3",
    name: "Clarkson Walter",
    role: "Administration - Management",
    ext: "3",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    id: "S7",
    name: "Hazel Carter",
    role: "Assistant Manager - Marketing",
    ext: "9",
    avatar: "https://i.pravatar.cc/80?img=47",
  },
];

const announcements = [
  { title: "Welcome to HRMS", date: "16 Jun 10:34 AM", by: "HR Team" },
  { title: "Quarterly all-hands on Friday", date: "15 Jun 09:12 AM", by: "CEO Office" },
];

const holidays = [
  { name: "Independence Day", date: "Aug 15, 2026", day: "Saturday" },
  { name: "Ganesh Chaturthi", date: "Aug 27, 2026", day: "Thursday" },
];

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700", className)}>
      {children}
    </span>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-md border border-blue-100 bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-xs font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ContentCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-md border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </section>
  );
}

function ProfileCard({
  data,
  onCheckIn,
  checkingIn,
}: {
  data: OverviewData;
  onCheckIn: () => void;
  checkingIn: boolean;
}) {
  return (
    <aside className="relative z-10 w-full shrink-0 rounded-md border border-slate-200 bg-white px-4 pb-4 pt-0 text-center shadow-sm lg:w-56">
      <div className="mx-auto -mt-12 grid h-20 w-20 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        <CircleUserRound className="h-16 w-16 text-slate-300" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">
        {data.profile.employee_code} - {data.profile.name}
      </p>
      <p className="mt-1 text-xs text-red-500">{data.profile.status_text}</p>
      <div className="mt-2 flex justify-center gap-1 text-sm font-semibold text-slate-900">
        {data.profile.timer.map((item, index) => (
          <span key={index} className="rounded bg-slate-100 px-1.5 py-0.5">
            {item}
          </span>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={checkingIn}
        onClick={onCheckIn}
        className="mt-3 h-8 w-28 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
      >
        {checkingIn ? "Saving..." : data.profile.check_in_button}
      </Button>
    </aside>
  );
}

function WorkTabs({ tabs, active, setActive }: { tabs: string[]; active: string; setActive: (tab: string) => void }) {
  return (
    <ContentCard className="overflow-hidden">
      <div className="flex items-center gap-1 overflow-x-auto px-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={cn(
              "h-11 shrink-0 border-b-2 border-transparent px-3 text-xs font-medium text-slate-700",
              active === tab && "border-blue-500 text-slate-950"
            )}
          >
            {tab}
          </button>
        ))}
        <button type="button" className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded text-slate-700 hover:bg-slate-50">
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded text-slate-700 hover:bg-slate-50">
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
    </ContentCard>
  );
}

function ActivitiesPanel({
  data,
  onCheckIn,
  checkingIn,
}: {
  data: OverviewData;
  onCheckIn: () => void;
  checkingIn: boolean;
}) {
  return (
    <div className="space-y-2">
      <ContentCard className="relative flex min-h-20 items-center gap-4 overflow-hidden p-4">
        <div className="grid h-14 w-20 place-items-center rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700">
          <span className="text-blue-600">Zoho</span>
          People
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {data.activity.greeting} <span className="font-medium">{data.activity.person_name}</span>
          </p>
          <p className="mt-1 text-xs text-slate-600">{data.activity.message}</p>
        </div>
        <div className="absolute bottom-0 right-5 h-16 w-24 rounded-t-full bg-orange-100" />
      </ContentCard>

      <ContentCard className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-red-50 text-red-500">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{data.activity.reminder_title}</p>
            <p className="text-xs text-slate-600">{data.activity.reminder_text}</p>
          </div>
        </div>
        <div className="text-xs text-slate-700">
          <p className="font-semibold text-slate-900">{data.shift.name}</p>
          <p>{data.shift.start_time}-{data.shift.end_time}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={checkingIn}
          onClick={onCheckIn}
          className="h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
        >
          {checkingIn ? "Saving..." : data.profile.check_in_button}
        </Button>
      </ContentCard>

      <ContentCard className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-sky-50 text-sky-500">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Work Schedule</p>
            <p className="mt-1 text-xs text-slate-700">{data.week_start} - {data.week_end}</p>
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[780px]">
                <div className="ml-10 rounded bg-slate-100 px-3 py-2 text-[10px] text-slate-800">
                  <p className="font-semibold">{data.shift.name}</p>
                  <p>{data.shift.start_time} - {data.shift.end_time}</p>
                </div>
                <div className="mt-2 grid grid-cols-7 border-t border-slate-200 text-xs">
                  {data.week.map((row) => (
                    <div key={`${row.day}-${row.date}`} className={cn("min-h-12 border-r border-slate-100 px-2 py-2 last:border-r-0", row.tone)}>
                      <p className="font-medium text-slate-700">
                        {row.day} <span className={row.is_today ? "rounded bg-blue-500 px-1 text-white" : ""}>{row.date}</span>
                      </p>
                      {row.note && <p className="mt-1 text-[11px]">{row.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContentCard>

      <ContentCard className="flex items-center gap-3 p-5">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-50 text-amber-500">
          <Timer className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-slate-900">{data.activity.time_log_message}</p>
      </ContentCard>
    </div>
  );
}

function ProfilePanel({ data }: { data: OverviewData }) {
  return (
    <div className="space-y-2">
      <ContentCard className="grid gap-4 p-4 md:grid-cols-3">
        <InfoTile icon={Briefcase} label="Shift" value={data.shift.display} />
        <InfoTile icon={Clock3} label="Time zone" value={data.profile_details.timezone} />
        <InfoTile icon={Mail} label="Email address" value={data.profile.email} />
      </ContentCard>

      <ContentCard className="p-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-slate-900">About Me</h3>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="mt-6 flex min-h-20 flex-col items-center justify-center rounded-md border border-slate-100 text-center">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-600">
            <FileText className="h-4 w-4" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-900">{data.profile_details.about_text}</p>
        </div>
      </ContentCard>

      <ContentCard className="p-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-slate-900">Tags</h3>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="flex min-h-28 flex-col items-center justify-center text-center">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-600">
            <Plus className="h-4 w-4" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-900">
            {data.profile_details.tags.length ? data.profile_details.tags.join(", ") : "Add Tags"}
          </p>
        </div>
      </ContentCard>

      <ContentCard className="p-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-slate-900">Basic information</h3>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
      </ContentCard>
    </div>
  );
}

function AttendancePanel({ data }: { data: OverviewData }) {
  return (
    <ContentCard className="overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">This Week</div>
      <div className="overflow-x-auto">
        <div className="min-w-[920px]">
          {data.week.map((row) => (
            <div key={row.date} className={cn("grid grid-cols-[90px_1fr_220px_150px] border-b border-slate-100 last:border-b-0", row.tone)}>
              <div className="px-7 py-4 text-center text-sm">
                <p>{row.day}</p>
                <p className={row.is_today ? "mx-auto mt-1 w-fit rounded-full bg-blue-500 px-2 py-0.5 text-white" : "font-semibold"}>{row.date}</p>
              </div>
              <div className="p-3">
                <div className="rounded bg-slate-100 px-3 py-2 text-xs">
                  <p className="font-semibold text-slate-900">{data.shift.name}</p>
                  <p>{data.shift.start_time} - {data.shift.end_time}</p>
                </div>
              </div>
              <div className="border-l border-slate-100 p-4 text-xs text-slate-900">
                {row.note ? (
                  <>
                    <p>No check-in - No check-out</p>
                    <p className={row.note === "Weekend" ? "text-orange-500" : "text-red-500"}>{row.note}</p>
                  </>
                ) : null}
              </div>
              <div className="border-l border-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </ContentCard>
  );
}

function TimeLogsPanel({ data }: { data: OverviewData }) {
  const projectLabel = data.time_logs.projects[0] ?? "Select Proj...";
  const jobLabel = data.time_logs.jobs[0] ?? "Select Job";
  return (
    <div className="space-y-4">
      <ContentCard className="flex flex-wrap items-center gap-2 p-3">
        {[projectLabel, jobLabel, "What are you working on?", data.time_logs.selected_billable].map((item, index) => (
          <button
            key={item}
            type="button"
            className={cn(
              "flex h-9 items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700",
              index === 2 ? "w-48 justify-start text-slate-400" : "w-28"
            )}
          >
            {item}
            {index !== 2 && <ChevronDown className="h-3 w-3" />}
          </button>
        ))}
        <button type="button" className="grid h-9 w-9 place-items-center rounded border border-slate-200 bg-slate-50 text-slate-500">
          <CalendarDays className="h-4 w-4" />
        </button>
        <Button className="ml-auto h-10 bg-emerald-500 px-5 hover:bg-emerald-600">
          {data.time_logs.timer}
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </ContentCard>
      <ContentCard className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-blue-50">
          <Clock3 className="h-12 w-12 text-blue-500" />
        </div>
        <p className="mt-5 text-sm font-semibold text-slate-900">{data.time_logs.empty_state}</p>
      </ContentCard>
    </div>
  );
}

function GenericPanel({ title, data }: { title: string; data?: OverviewData }) {
  const moduleState = data?.modules?.[title];
  return (
    <ContentCard className="flex min-h-52 items-center justify-center p-6 text-sm text-slate-500">
      {moduleState?.empty_state ?? `${title} coming soon.`}
    </ContentCard>
  );
}

const calendarDays = [
  { day: 31, muted: true },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5 },
  { day: 6 },
  { day: 7 },
  { day: 8 },
  { day: 9 },
  { day: 10 },
  { day: 11 },
  { day: 12 },
  { day: 13 },
  { day: 14, weekend: true, events: [{ label: "Weekend", tone: "text-orange-500" }] },
  { day: 15, events: [{ label: "Absent", tone: "text-red-500" }] },
  { day: 16, today: true, events: [{ label: "General", tone: "text-blue-600" }] },
  { day: 17, events: [{ label: "General", tone: "text-blue-600" }] },
  { day: 18, events: [{ label: "General", tone: "text-blue-600" }] },
  { day: 19, events: [{ label: "General", tone: "text-blue-600" }] },
  { day: 20, weekend: true, events: [{ label: "Weekend", tone: "text-orange-500" }] },
  { day: 21, weekend: true },
  { day: 22 },
  { day: 23 },
  { day: 24 },
  { day: 25 },
  { day: 26 },
  { day: 27 },
  { day: 28, weekend: true },
  { day: 29 },
  { day: 30 },
  { day: 1, muted: true },
  { day: 2, muted: true },
  { day: 3, muted: true },
  { day: 4, muted: true },
];

function CalendarPanel() {
  return (
    <div className="space-y-3">
      <ContentCard className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Calendar</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">June 2026</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">Today</Button>
          <Button variant="outline" size="sm" className="h-8">Month</Button>
          <Button variant="outline" size="sm" className="h-8">Week</Button>
        </div>
      </ContentCard>

      <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
        <ContentCard className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="border-r border-slate-200 px-2 py-2 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => (
              <div
                key={`${date.day}-${index}`}
                className={cn(
                  "min-h-24 border-b border-r border-slate-100 bg-white p-2 text-xs last:border-r-0",
                  date.weekend && "bg-orange-50/60",
                  date.muted && "bg-slate-50 text-slate-400"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full font-medium",
                      date.today && "bg-blue-500 text-white",
                      !date.today && !date.muted && "text-slate-800"
                    )}
                  >
                    {date.day}
                  </span>
                  {date.today && <span className="text-[10px] font-semibold text-blue-600">Today</span>}
                </div>
                <div className="mt-2 space-y-1">
                  {date.events?.map((event) => (
                    <div key={event.label} className="rounded bg-slate-100 px-2 py-1">
                      <p className={cn("truncate font-medium", event.tone)}>{event.label}</p>
                      {event.label === "General" && <p className="truncate text-[10px] text-slate-500">9:00 AM - 6:00 PM</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ContentCard>

        <div className="space-y-3">
          <ContentCard className="p-4">
            <h3 className="text-sm font-semibold text-slate-900">Today</h3>
            <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3">
              <p className="text-sm font-semibold text-slate-900">General Shift</p>
              <p className="mt-1 text-xs text-slate-600">9:00 AM - 6:00 PM</p>
              <p className="mt-2 text-xs text-red-500">Yet to check-in</p>
            </div>
          </ContentCard>

          <ContentCard className="p-4">
            <h3 className="text-sm font-semibold text-slate-900">Upcoming Holidays</h3>
            <ul className="mt-3 space-y-3">
              {holidays.map((holiday) => (
                <li key={holiday.name} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{holiday.name}</p>
                    <p className="text-xs text-slate-500">{holiday.day}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{holiday.date}</span>
                </li>
              ))}
            </ul>
          </ContentCard>

          <ContentCard className="p-4">
            <h3 className="text-sm font-semibold text-slate-900">Legend</h3>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" /> Shift</p>
              <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" /> Absent</p>
              <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-orange-400" /> Weekend</p>
            </div>
          </ContentCard>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 flex-1 items-center justify-center text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function WidgetCard({
  title,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  icon: LucideIcon;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ContentCard className="flex min-h-52 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-blue-600" />
          {title}
        </h3>
        {right}
      </div>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </ContentCard>
  );
}

function DashboardWidgets() {
  const [fileTab, setFileTab] = useState<"organization" | "employee">("organization");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" title="Settings">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <WidgetCard title="Birthday" icon={Cake}>
          <EmptyState text="No birthdays today" />
        </WidgetCard>

        <WidgetCard title="New Hires" icon={UserPlus}>
          <ul className="divide-y divide-slate-200">
            {newHires.map((person) => (
              <li key={person.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <img src={person.avatar} alt={person.name} className="h-12 w-12 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="text-slate-500">{person.id} - </span>
                    <span className="font-semibold text-slate-900">{person.name}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">{person.role}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Phone className="h-3 w-3" /> {person.ext}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </WidgetCard>

        <WidgetCard title="Favorites" icon={Star}>
          <EmptyState text="No Favorites found." />
        </WidgetCard>

        <WidgetCard title="Quick Links" icon={Link2}>
          <EmptyState text="No quick links" />
        </WidgetCard>

        <WidgetCard title="Announcements" icon={Megaphone}>
          <ul className="space-y-3">
            {announcements.map((item) => (
              <li key={item.title} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.date} · {item.by}
                  </p>
                </div>
                <Badge className="shrink-0 text-[10px]">New</Badge>
              </li>
            ))}
          </ul>
        </WidgetCard>

        <WidgetCard title="Lop Summary" icon={CalendarMinus}>
          <EmptyState text="No pay period is configured" />
        </WidgetCard>

        <WidgetCard title="Leave Report" icon={CalendarCheck}>
          <div className="grid flex-1 grid-cols-3 gap-3">
            {[
              { label: "Casual", used: 2, total: 12 },
              { label: "Sick", used: 1, total: 10 },
              { label: "Earned", used: 4, total: 15 },
            ].map((leave) => (
              <div key={leave.label} className="rounded-md border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">{leave.label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {leave.used}
                  <span className="text-xs text-slate-500">/{leave.total}</span>
                </p>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Upcoming Holidays" icon={CalendarDays}>
          <ul className="divide-y divide-slate-200">
            {holidays.map((holiday) => (
              <li key={holiday.name} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{holiday.name}</p>
                  <p className="text-xs text-slate-500">{holiday.day}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{holiday.date}</span>
              </li>
            ))}
          </ul>
        </WidgetCard>

        <WidgetCard title="My Pending Tasks" icon={ListChecks} right={<Badge>0</Badge>}>
          <EmptyState text="There are no tasks available" />
        </WidgetCard>

        <WidgetCard
          title="My Files"
          icon={Folder}
          right={
            <span className="text-xs text-slate-500">
              Total Files <Badge className="ml-1">0</Badge>
            </span>
          }
        >
          <div className="flex gap-4 border-b border-slate-200 text-sm">
            <button
              type="button"
              onClick={() => setFileTab("organization")}
              className={cn(
                "border-b-2 pb-2 transition",
                fileTab === "organization" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Organization Files
            </button>
            <button
              type="button"
              onClick={() => setFileTab("employee")}
              className={cn(
                "border-b-2 pb-2 transition",
                fileTab === "employee" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Employee Files
            </button>
          </div>
          <EmptyState text={fileTab === "organization" ? "No organization files found" : "No employee files found"} />
        </WidgetCard>

        <WidgetCard
          title="Employee Engagement"
          icon={HeartPulse}
          right={
            <span className="text-xs text-slate-500">
              Pending <Badge className="ml-1">0</Badge>
            </span>
          }
        >
          <EmptyState text="No pending surveys" />
        </WidgetCard>
      </div>
    </div>
  );
}

function ActivePanel({
  active,
  data,
  onCheckIn,
  checkingIn,
}: {
  active: string;
  data: OverviewData;
  onCheckIn: () => void;
  checkingIn: boolean;
}) {
  if (active === "Activities") return <ActivitiesPanel data={data} onCheckIn={onCheckIn} checkingIn={checkingIn} />;
  if (active === "Profile") return <ProfilePanel data={data} />;
  if (active === "Attendance") return <AttendancePanel data={data} />;
  if (active === "Time Logs") return <TimeLogsPanel data={data} />;
  return <GenericPanel title={active} data={data} />;
}

function HeaderProfileMenu() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.me().then(setMe).catch(() => {}); }, []);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function logout() { tokenStore.clear(); router.replace("/login"); }

  return (
    <div ref={menuRef} className="relative ml-auto self-center">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        <div className="h-5 w-5 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-[10px] font-semibold">
          {me?.email?.[0]?.toUpperCase() ?? "A"}
        </div>
        <span className="hidden sm:inline">{me?.email ?? "Account"}</span>
        <ChevronDown className="h-3 w-3 text-slate-400"/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-slate-200 bg-white shadow-lg py-1 z-30">
          <Link
            href="/dashboard?tab=Profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <CircleUserRound className="h-4 w-4"/>Profile
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4"/>Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [mainTab, setMainTab] = useState("overview");
  const [workTab, setWorkTab] = useState(requestedTab || "Activities");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewError, setOverviewError] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    api.dashboardOverview()
      .then((data) => {
        setOverview(data);
        setWorkTab(requestedTab || data.tabs?.[0] || "Activities");
      })
      .catch((error) => setOverviewError(error.message || "Unable to load overview"));
  }, [requestedTab]);

  async function handleCheckIn() {
    setCheckingIn(true);
    setOverviewError("");
    try {
      const updated = await api.checkIn();
      setOverview(updated);
    } catch (error: any) {
      setOverviewError(error.message || "Unable to check in");
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex h-9 items-end gap-5 border-b border-slate-200 bg-white px-4">
        {mainTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMainTab(tab)}
            className={cn(
              "h-full border-b-2 border-transparent px-1 text-xs font-medium capitalize text-slate-900",
              mainTab === tab && "border-blue-500"
            )}
          >
            {tab}
          </button>
        ))}
        <HeaderProfileMenu/>
      </div>

      <div className="relative">
        <div
          className="h-28 bg-slate-900 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.15)), url('https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1600&q=80')",
          }}
        />
        <button className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded bg-white text-slate-700 shadow">
          <MoreHorizontal className="h-4 w-4" />
        </button>

        <main className={cn("-mt-5 flex flex-col gap-2 px-4 pb-6 lg:px-10", mainTab === "overview" && "lg:flex-row")}>
          {mainTab === "overview" && overview && (
            <ProfileCard data={overview} onCheckIn={handleCheckIn} checkingIn={checkingIn} />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            {mainTab === "overview" && (
              overview ? (
                <>
                  <WorkTabs tabs={overview.tabs.length ? overview.tabs : workTabs} active={workTab} setActive={setWorkTab} />
                  <ActivePanel active={workTab} data={overview} onCheckIn={handleCheckIn} checkingIn={checkingIn} />
                  {overviewError && <p className="text-xs text-red-500">{overviewError}</p>}
                </>
              ) : (
                <ContentCard className="p-6 text-sm text-slate-500">
                  {overviewError || "Loading overview..."}
                </ContentCard>
              )
            )}
            {mainTab === "dashboard" && <DashboardWidgets />}
            {mainTab === "calendar" && <CalendarPanel />}
          </div>
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 hidden h-6 border-t border-slate-200 bg-white text-[10px] text-slate-500 lg:flex">
        <div className="w-28 border-r border-slate-200 text-center">Chats</div>
        <div className="w-28 border-r border-slate-200 text-center">Contacts</div>
        <div className="flex-1 px-3">Here is your Smart Chat (Ctrl+Space)</div>
        <Moon className="mr-3 mt-1 h-3 w-3" />
        <Filter className="mr-3 mt-1 h-3 w-3" />
      </footer>
    </div>
  );
}
