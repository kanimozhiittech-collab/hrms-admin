"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Topbar } from "@/components/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api, fileUrl } from "@/lib/api";
import { Plus, Trash2, Upload, Save, X, Eye, EyeOff } from "lucide-react";

/* ---------- Schema ---------- */
const schema = z.object({
  // Personal
  emp_code: z.string().optional().or(z.literal("")),
  prefix: z.string().optional().or(z.literal("")),
  first_name: z.string().min(1, "Required"),
  middle_name: z.string().optional().or(z.literal("")),
  last_name: z.string().min(1, "Required"),
  display_name: z.string().optional().or(z.literal("")),
  gender: z.string().min(1, "Required"),
  date_of_birth: z.string().min(1, "Required"),
  blood_group: z.string().min(1, "Required"),
  marital_status: z.string().min(1, "Required"),
  nationality: z.string().min(1, "Required"),
  photo_url: z.string().optional().or(z.literal("")),
  // Contact
  work_email: z.string().email("Invalid email"),
  personal_email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().min(1, "Required").regex(/^[^a-zA-Z]*$/, "Letters are not allowed"),
  alt_phone: z.string().optional().or(z.literal("")).refine(v => !v || /^[^a-zA-Z]*$/.test(v), { message: "Letters are not allowed" }),
  password: z.string().min(6, "At least 6 characters").optional().or(z.literal("")),
  // Job
  department_id: z.string().min(1, "Required"),
  designation_id: z.string().min(1, "Required"),
  employee_type: z.string(),
  date_of_joining: z.string().min(1, "Required"),
  probation_end_date: z.string().optional().or(z.literal("")),
  confirmation_date: z.string().optional().or(z.literal("")),
  reporting_manager_id: z.string().optional().or(z.literal("")),
  work_location_id: z.string().min(1, "Required"),
  shift_id: z.string().optional().or(z.literal("")),
  source_of_hire: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  status: z.string(),
  exit_date: z.string().optional().or(z.literal("")),
  // Comp
  ctc: z.coerce.number().optional().or(z.literal("")),
  pay_frequency: z.string().optional().or(z.literal("")),
  // Bank
  bank_name: z.string().optional().or(z.literal("")),
  bank_account_no: z.string().optional().or(z.literal("")),
  bank_ifsc: z.string().optional().or(z.literal("")),
  bank_branch: z.string().optional().or(z.literal("")),
  bank_account_type: z.string().optional().or(z.literal("")),
  // Statutory
  pan_number: z.string().optional().or(z.literal("")),
  aadhaar_number: z.string().optional().or(z.literal("")),
  uan_number: z.string().optional().or(z.literal("")),
  pf_number: z.string().optional().or(z.literal("")),
  esi_number: z.string().optional().or(z.literal("")),
  passport_number: z.string().optional().or(z.literal("")),
  passport_expiry: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  // Nested
  addresses: z.array(z.object({
    address_type: z.enum(["Present","Permanent"]),
    line1: z.string().min(1, "Required"),
    line2: z.string().optional().or(z.literal("")),
    city: z.string().min(1, "Required"),
    state: z.string().min(1, "Required"),
    country: z.string().min(1, "Required"),
    pincode: z.string().min(1, "Required"),
  })),
  education: z.array(z.object({
    id: z.string().optional().or(z.literal("")),
    institute: z.string().optional().or(z.literal("")),
    degree: z.string().optional().or(z.literal("")),
    specialization: z.string().optional().or(z.literal("")),
    year_from: z.coerce.number().optional().or(z.literal("")),
    year_to: z.coerce.number().optional().or(z.literal("")),
    grade: z.string().optional().or(z.literal("")),
    file_name: z.string().optional().or(z.literal("")),
    file_url: z.string().optional().or(z.literal("")),
  })),
  experience: z.array(z.object({
    id: z.string().optional().or(z.literal("")),
    company_name: z.string().optional().or(z.literal("")),
    designation: z.string().optional().or(z.literal("")),
    from_date: z.string().optional().or(z.literal("")),
    to_date: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
    file_name: z.string().optional().or(z.literal("")),
    file_url: z.string().optional().or(z.literal("")),
  })),
  dependents: z.array(z.object({
    name: z.string().min(1),
    relationship_type: z.string().optional().or(z.literal("")),
    date_of_birth: z.string().optional().or(z.literal("")),
    gender: z.string().optional().or(z.literal("")),
    is_dependent: z.boolean().default(true),
  })),
  emergency_contacts: z.array(z.object({
    name: z.string().min(1),
    relationship_type: z.string().optional().or(z.literal("")),
    mobile: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
  })),
});

export type EmployeeFormValues = z.infer<typeof schema>;

/** Which tab each top-level schema field lives on — used to jump straight to
 * the tab with an error on a failed save, since errors on a hidden tab are
 * otherwise invisible (TabsContent unmounts inactive tabs). */
const TAB_OF_FIELD: Record<string, string> = {
  emp_code: "profile", prefix: "profile", first_name: "profile", middle_name: "profile", last_name: "profile",
  display_name: "profile", gender: "profile", date_of_birth: "profile", blood_group: "profile",
  marital_status: "profile", nationality: "profile", photo_url: "profile",
  work_email: "profile", personal_email: "profile", mobile: "profile", alt_phone: "profile", password: "profile",
  addresses: "profile", dependents: "profile", emergency_contacts: "profile",
  department_id: "job", designation_id: "job", employee_type: "job", date_of_joining: "job",
  probation_end_date: "job", confirmation_date: "job", reporting_manager_id: "job", work_location_id: "job",
  shift_id: "job", source_of_hire: "job", tags: "job", status: "job", exit_date: "job",
  ctc: "job", pay_frequency: "job", notes: "job",
  bank_name: "job", bank_account_no: "job", bank_ifsc: "job", bank_branch: "job", bank_account_type: "job",
  pan_number: "job", aadhaar_number: "job", uan_number: "job", pf_number: "job", esi_number: "job",
  passport_number: "job", passport_expiry: "job",
  education: "background", experience: "background",
};

/** Walks react-hook-form's (possibly nested/array) error tree to the first
 * leaf, returning a dot-path like "addresses.1.line1" matching the `name`
 * attribute on the actual input — so it can be found and scrolled to. */
function firstErrorPath(errors: any, prefix = ""): string | null {
  if (!errors || typeof errors !== "object") return null;
  for (const key of Object.keys(errors)) {
    const val = errors[key];
    if (!val || typeof val !== "object") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val.message === "string") return path;
    const nested = firstErrorPath(val, path);
    if (nested) return nested;
  }
  return null;
}

const NATIONALITIES = [
  "Afghan","Albanian","Algerian","American","Andorran","Angolan","Argentine","Armenian","Australian","Austrian",
  "Azerbaijani","Bahamian","Bahraini","Bangladeshi","Barbadian","Belarusian","Belgian","Belizean","Beninese","Bhutanese",
  "Bolivian","Bosnian","Botswanan","Brazilian","British","Bruneian","Bulgarian","Burkinabe","Burmese","Burundian",
  "Cambodian","Cameroonian","Canadian","Cape Verdean","Central African","Chadian","Chilean","Chinese","Colombian","Comoran",
  "Congolese","Costa Rican","Croatian","Cuban","Cypriot","Czech","Danish","Djiboutian","Dominican","Dutch",
  "East Timorese","Ecuadorian","Egyptian","Emirati","English","Equatorial Guinean","Eritrean","Estonian","Ethiopian","Fijian",
  "Filipino","Finnish","French","Gabonese","Gambian","Georgian","German","Ghanaian","Greek","Grenadian",
  "Guatemalan","Guinean","Guyanese","Haitian","Honduran","Hungarian","Icelandic","Indian","Indonesian","Iranian",
  "Iraqi","Irish","Israeli","Italian","Ivorian","Jamaican","Japanese","Jordanian","Kazakhstani","Kenyan",
  "Kittitian","Kuwaiti","Kyrgyz","Laotian","Latvian","Lebanese","Liberian","Libyan","Liechtensteiner","Lithuanian",
  "Luxembourgish","Macedonian","Malagasy","Malawian","Malaysian","Maldivian","Malian","Maltese","Marshallese","Mauritanian",
  "Mauritian","Mexican","Micronesian","Moldovan","Monacan","Mongolian","Montenegrin","Moroccan","Mozambican","Namibian",
  "Nauruan","Nepalese","New Zealander","Nicaraguan","Nigerian","Nigerien","North Korean","Norwegian","Omani","Pakistani",
  "Palauan","Palestinian","Panamanian","Papua New Guinean","Paraguayan","Peruvian","Polish","Portuguese","Qatari","Romanian",
  "Russian","Rwandan","Salvadoran","Samoan","San Marinese","Sao Tomean","Saudi Arabian","Scottish","Senegalese","Serbian",
  "Seychellois","Sierra Leonean","Singaporean","Slovak","Slovenian","Solomon Islander","Somali","South African","South Korean","South Sudanese",
  "Spanish","Sri Lankan","Sudanese","Surinamese","Swazi","Swedish","Swiss","Syrian","Taiwanese","Tajik",
  "Tanzanian","Thai","Togolese","Tongan","Trinidadian","Tunisian","Turkish","Turkmen","Tuvaluan","Ugandan",
  "Ukrainian","Uruguayan","Uzbek","Vanuatuan","Venezuelan","Vietnamese","Welsh","Yemeni","Zambian","Zimbabwean",
] as const;

export const EMPLOYEE_FORM_DEFAULTS: EmployeeFormValues = {
  emp_code: "", first_name: "", last_name: "", work_email: "", password: "",
  employee_type: "Permanent", status: "Active", pay_frequency: "Monthly",
  addresses: [
    { address_type: "Present", line1:"", line2:"", city:"", state:"", country:"India", pincode:"" },
    { address_type: "Permanent", line1:"", line2:"", city:"", state:"", country:"India", pincode:"" },
  ],
  education: [{ institute:"", degree:"", specialization:"", grade:"" } as any],
  experience: [],
  dependents: [],
  emergency_contacts: [],
} as any;

/** Convert an EmployeeOut record (nulls, nested arrays) into form-safe defaultValues (no nulls). */
export function employeeToFormValues(e: any): EmployeeFormValues {
  const scalarKeys = [
    "emp_code","prefix","first_name","middle_name","last_name","display_name","gender",
    "date_of_birth","blood_group","marital_status","nationality","photo_url",
    "work_email","personal_email","mobile","alt_phone",
    "department_id","designation_id","employee_type","date_of_joining","probation_end_date",
    "confirmation_date","reporting_manager_id","work_location_id","shift_id","source_of_hire",
    "tags","status","exit_date","ctc","pay_frequency",
    "bank_name","bank_account_no","bank_ifsc","bank_branch","bank_account_type",
    "pan_number","aadhaar_number","uan_number","pf_number","esi_number",
    "passport_number","passport_expiry","notes",
  ];
  const out: any = {};
  for (const k of scalarKeys) out[k] = e[k] ?? "";
  out.password = ""; // never returned by the server — blank means "keep current password"
  out.addresses =(e.addresses?.length ? e.addresses : EMPLOYEE_FORM_DEFAULTS.addresses).map((a: any) => ({
    address_type: a.address_type || "Present", line1: a.line1 ?? "", line2: a.line2 ?? "",
    city: a.city ?? "", state: a.state ?? "", country: a.country ?? "", pincode: a.pincode ?? "",
  }));
  out.education = (e.education || []).map((x: any) => ({
    id: x.id ?? "", institute: x.institute ?? "", degree: x.degree ?? "", specialization: x.specialization ?? "",
    year_from: x.year_from ?? "", year_to: x.year_to ?? "", grade: x.grade ?? "",
    file_name: x.file_name ?? "", file_url: x.file_url ?? "",
  }));
  out.experience = (e.experience || []).map((x: any) => ({
    id: x.id ?? "", company_name: x.company_name ?? "", designation: x.designation ?? "",
    from_date: x.from_date ?? "", to_date: x.to_date ?? "", description: x.description ?? "",
    file_name: x.file_name ?? "", file_url: x.file_url ?? "",
  }));
  out.dependents = (e.dependents || []).map((x: any) => ({
    name: x.name ?? "", relationship_type: x.relationship_type ?? "",
    date_of_birth: x.date_of_birth ?? "", gender: x.gender ?? "", is_dependent: x.is_dependent ?? true,
  }));
  out.emergency_contacts = (e.emergency_contacts || []).map((x: any) => ({
    name: x.name ?? "", relationship_type: x.relationship_type ?? "", mobile: x.mobile ?? "", address: x.address ?? "",
  }));
  return out;
}

/* ---------- Field helpers ---------- */
function Field({ label, error, children }: any) {
  const required = typeof label === "string" && label.trim().endsWith("*");
  const labelText = required ? label.trim().slice(0, -1).trim() : label;
  return (
    <div className="space-y-1.5">
      <Label>{labelText}{required && <span className="text-red-600"> *</span>}</Label>{children}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function TextField({ name, label, type = "text", placeholder, disabled, min, max, blockAlpha }: any) {
  const { register, formState: { errors }, setValue } = useFormContext();
  const err = (errors as any)[name]?.message;
  const field = register(name);
  return (
    <Field label={label} error={err}>
      <Input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        {...field}
        onChange={blockAlpha ? (e: any) => {
          setValue(name, e.target.value.replace(/[a-zA-Z]/g, ""), { shouldValidate: true });
        } : field.onChange}
      />
    </Field>
  );
}

function SelectField({ name, label, children }: any) {
  const { register, formState: { errors } } = useFormContext();
  const err = (errors as any)[name]?.message;
  return <Field label={label} error={err}><Select {...register(name)}>{children}</Select></Field>;
}

function PasswordField({ name, label, placeholder, show, onToggle }: any) {
  const { register, formState: { errors } } = useFormContext();
  const err = (errors as any)[name]?.message;
  return (
    <Field label={label} error={err}>
      <div className="relative">
        <Input type={show ? "text" : "password"} placeholder={placeholder} className="pr-9" {...register(name)}/>
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-700"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
        </button>
      </div>
    </Field>
  );
}

/** Small inline upload control used next to PAN/Aadhaar/Passport — the file is
 * queued and uploaded (via the generic employee-documents endpoint) right after
 * the employee record itself is saved. */
function StatutoryDocUpload({ docType, file, existing, onSelect }: {
  docType: string; file?: File; existing?: { file_url: string; file_name: string };
  onSelect: (f: File) => void;
}) {
  const inputId = `statutory-doc-${docType}`;
  return (
    <div className="mt-1 text-xs">
      <input id={inputId} type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}/>
      <label htmlFor={inputId} className="inline-flex items-center gap-1 text-brand-700 cursor-pointer hover:underline">
        <Upload className="h-3 w-3"/>
        {file ? file.name : existing ? "Replace document" : `Upload ${docType} document`}
      </label>
      {!file && existing && (
        <a href={fileUrl(existing.file_url)} target="_blank" rel="noreferrer" className="ml-2 text-slate-400 hover:text-slate-700 hover:underline">View current</a>
      )}
    </div>
  );
}

/** Per-row certificate/letter upload used in Education and Experience — same
 * deferred-until-save pattern as the photo/statutory uploads above. */
function RowFileUpload({ id, label, file, existingUrl, existingName, onSelect }: {
  id: string; label: string; file?: File; existingUrl?: string; existingName?: string;
  onSelect: (f: File) => void;
}) {
  return (
    <div className="text-xs">
      <input id={id} type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}/>
      <label htmlFor={id} className="inline-flex items-center gap-1 text-brand-700 cursor-pointer hover:underline">
        <Upload className="h-3 w-3"/>
        {file ? file.name : existingUrl ? "Replace" : label}
      </label>
      {!file && existingUrl && (
        <a href={fileUrl(existingUrl)} target="_blank" rel="noreferrer" className="ml-2 text-slate-400 hover:text-slate-700 hover:underline">
          {existingName || "View"}
        </a>
      )}
    </div>
  );
}

function SectionHeader({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className={`text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100 ${first ? "" : "mt-8"}`}>
      {children}
    </div>
  );
}

/* ---------- Shared form used by both Add Employee and Edit Employee ---------- */
export function EmployeeForm({
  mode, employeeId, initialValues, linkUserId, defaultEmail,
}: {
  mode: "create" | "edit";
  employeeId?: string;
  initialValues?: EmployeeFormValues;
  /** When creating from Manage Accounts' "Create New Employee Profile" flow — the
   * login account to link to the newly created employee once it's saved. */
  linkUserId?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("profile");
  const [meta, setMeta] = useState<{depts: any[]; desigs: any[]; locs: any[]; shifts: any[]; managers: any[]}>({depts:[],desigs:[],locs:[],shifts:[],managers:[]});
  const [docType, setDocType] = useState("Aadhaar");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [statutoryFiles, setStatutoryFiles] = useState<Record<string, File>>({});
  const [eduFiles, setEduFiles] = useState<Record<number, File>>({});
  const [expFiles, setExpFiles] = useState<Record<number, File>>({});
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([api.departments(), api.designations(), api.locations(), api.shifts(), api.listEmployees({ page_size: 100 })])
      .then(([depts, desigs, locs, shifts, empRes]) => setMeta({ depts, desigs, locs, shifts, managers: empRes.items || [] }));
  }, []);

  const methods = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: (initialValues || (defaultEmail ? { ...EMPLOYEE_FORM_DEFAULTS, work_email: defaultEmail } : EMPLOYEE_FORM_DEFAULTS)) as any,
  });

  const eduFA = useFieldArray({ control: methods.control, name: "education" });
  const expFA = useFieldArray({ control: methods.control, name: "experience" });

  /** Removing a row shifts every later row's index down by one — re-key the
   * pending-file map so an already-selected file stays attached to its row. */
  function reindexAfterRemove(files: Record<number, File>, removedIndex: number): Record<number, File> {
    const next: Record<number, File> = {};
    for (const [k, v] of Object.entries(files)) {
      const idx = Number(k);
      if (idx === removedIndex) continue;
      next[idx > removedIndex ? idx - 1 : idx] = v;
    }
    return next;
  }
  function removeEdu(i: number) { eduFA.remove(i); setEduFiles(f => reindexAfterRemove(f, i)); }
  function removeExp(i: number) { expFA.remove(i); setExpFiles(f => reindexAfterRemove(f, i)); }
  const depFA = useFieldArray({ control: methods.control, name: "dependents" });
  const emgFA = useFieldArray({ control: methods.control, name: "emergency_contacts" });

  async function uploadPendingFiles(res: any) {
    if (docFile) {
      await api.uploadEmployeeDocument(res.id, docType, docFile);
      toast.success(`${docFile.name} uploaded`);
    }
    if (photoFile) await api.uploadEmployeePhoto(res.id, photoFile);
    for (const [type, file] of Object.entries(statutoryFiles)) {
      await api.uploadEmployeeDocument(res.id, type, file);
    }
    for (const [idxStr, file] of Object.entries(eduFiles)) {
      const row = res.education?.[Number(idxStr)];
      if (row?.id) await api.uploadEducationFile(res.id, row.id, file);
    }
    for (const [idxStr, file] of Object.entries(expFiles)) {
      const row = res.experience?.[Number(idxStr)];
      if (row?.id) await api.uploadExperienceFile(res.id, row.id, file);
    }
  }

  /** A file upload failing here (network blip, large file) shouldn't be
   * reported as if the employee record itself failed to save — it already
   * exists at this point. Surface it as a separate warning instead. */
  async function uploadPendingFilesSafely(res: any) {
    try { await uploadPendingFiles(res); }
    catch (e: any) { toast.error(`Saved, but a file upload failed: ${e.message}`); }
  }

  async function onSubmit(values: EmployeeFormValues, saveAndNew = false) {
    const clean: any = { ...values };
    Object.keys(clean).forEach(k => { if (clean[k] === "") clean[k] = null; });
    try {
      if (mode === "edit" && employeeId) {
        const res = await api.updateEmployee(employeeId, clean);
        await uploadPendingFilesSafely(res);
        toast.success(`${res.first_name} ${res.last_name} updated`);
        router.push(`/employees/${res.id}`);
      } else {
        const res = await api.createEmployee(clean);
        await uploadPendingFilesSafely(res);
        if (linkUserId) {
          await api.updateUserProfile(linkUserId, { email: res.work_email, employee_id: res.id });
          toast.success(`${res.first_name} ${res.last_name} created and linked to the login account`);
        } else {
          toast.success(`${res.first_name} ${res.last_name} created`);
        }
        if (saveAndNew && !linkUserId) {
          methods.reset();
          setDocFile(null);
          setPhotoFile(null);
          setStatutoryFiles({});
          setEduFiles({});
          setExpFiles({});
        } else {
          router.push(`/employees/${res.id}`);
        }
      }
    } catch (e: any) {
      // The browser's own message for a dropped/failed request ("Failed to
      // fetch") reads as a crash, not a "try again" — say what actually happened.
      const msg = e.message === "Failed to fetch"
        ? "Couldn't reach the server — check your connection and try again."
        : e.message;
      toast.error(msg);
    }
  }

  const tabs = [
    ["profile","Personal, Contact & Family"],
    ["job","Job & Compensation"],
    ["background","Education & Experience"],
  ];

  /** Jump to the tab holding the first invalid field, since a hidden tab's
   * errors are otherwise invisible until the user happens to click over. */
  function onInvalid(errors: any) {
    const firstErrorKey = Object.keys(errors)[0];
    const targetTab = firstErrorKey && TAB_OF_FIELD[firstErrorKey];
    if (targetTab && targetTab !== tab) setTab(targetTab);
    toast.error("Please fix the highlighted fields");
    // The error can be several fields deep (e.g. addresses.1.line1 for the
    // Permanent Address block) — without this it's easy to land on the right
    // tab but not see the actual red text without scrolling to hunt for it.
    const path = firstErrorPath(errors);
    if (path) {
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[name="${path}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
      }, 100);
    }
  }

  const { errors: formErrors } = methods.formState;
  const tabHasError = (tabKey: string) =>
    Object.keys(formErrors).some(k => TAB_OF_FIELD[k] === tabKey);

  return (
    <>
      <Topbar title={mode === "edit" ? "Edit Employee" : "New Employee"}/>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(v => onSubmit(v, false), onInvalid)} className="p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{mode === "edit" ? "Edit Employee" : linkUserId ? "Create Employee Profile" : "Add Employee"}</h2>
              <p className="text-sm text-slate-500">
                {linkUserId
                  ? "This profile will be linked to the existing login account once saved."
                  : "Fill the form across tabs. Required fields are marked."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}><X className="h-4 w-4"/>Cancel</Button>
              {mode === "create" && !linkUserId && (
                <Button type="button" variant="outline" onClick={methods.handleSubmit(v => onSubmit(v, true), onInvalid)}><Save className="h-4 w-4"/>Save & New</Button>
              )}
              <Button type="submit"><Save className="h-4 w-4"/>Save</Button>
            </div>
          </div>

          <Card>
            <CardContent>
              <Tabs value={tab} onValueChange={setTab} defaultValue="profile">
                <TabsList>
                  {tabs.map(([v,l]) => (
                    <TabsTrigger key={v} value={v}>
                      {l}
                      {tabHasError(v) && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500" aria-label="Has errors"/>}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* PERSONAL, CONTACT & FAMILY */}
                <TabsContent value="profile">
                  <SectionHeader first>Personal Details</SectionHeader>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 grid place-items-center shrink-0">
                      {photoFile ? (
                        <img src={URL.createObjectURL(photoFile)} alt="Photo preview" className="h-full w-full object-cover"/>
                      ) : methods.watch("photo_url") ? (
                        <img src={fileUrl(methods.watch("photo_url"))} alt="Photo" className="h-full w-full object-cover"/>
                      ) : (
                        <Upload className="h-6 w-6 text-slate-300"/>
                      )}
                    </div>
                    <div>
                      <input
                        id="employee-photo-file"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                      />
                      <label htmlFor="employee-photo-file" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 cursor-pointer hover:underline">
                        <Upload className="h-3.5 w-3.5"/>{photoFile ? photoFile.name : "Upload Photo"}
                      </label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {photoFile ? "Uploaded when you save." : "JPG or PNG."}
                      </p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <TextField
                      name="emp_code"
                      label="Employee ID"
                      placeholder={mode === "create" ? "Auto-generated on save" : ""}
                      disabled={mode === "create"}
                    />
                    <SelectField name="prefix" label="Prefix">
                      <option value="">—</option><option>Mr</option><option>Ms</option><option>Mrs</option><option>Dr</option>
                    </SelectField>
                    <div/>
                    <TextField name="first_name" label="First Name *"/>
                    <TextField name="middle_name" label="Middle Name"/>
                    <TextField name="last_name" label="Last Name *"/>
                    <TextField name="display_name" label="Display Name"/>
                    <SelectField name="gender" label="Gender *">
                      <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                    </SelectField>
                    <TextField name="date_of_birth" label="Date of Birth *" type="date" min="1900-01-01" max={todayStr}/>
                    <SelectField name="blood_group" label="Blood Group *">
                      <option value="">—</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b=> <option key={b}>{b}</option>)}
                    </SelectField>
                    <SelectField name="marital_status" label="Marital Status *">
                      <option value="">—</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                    </SelectField>
                    <SelectField name="nationality" label="Nationality *">
                      <option value="">—</option>{NATIONALITIES.map(n => <option key={n}>{n}</option>)}
                    </SelectField>
                  </div>

                  <SectionHeader>Contact Details</SectionHeader>
                  <div className="grid md:grid-cols-2 gap-4">
                    <TextField name="work_email" label="Work Email *" type="email"/>
                    <TextField name="personal_email" label="Personal Email" type="email"/>
                    <TextField name="mobile" label="Mobile *" placeholder="+91 …" blockAlpha/>
                    <TextField name="alt_phone" label="Alternate Phone" blockAlpha/>
                    <div>
                      <PasswordField
                        name="password"
                        label={mode === "edit" ? "Reset Login Password" : "Login Password"}
                        placeholder={mode === "edit" ? "Leave blank to keep current password" : "Leave blank to use the default password"}
                        show={showPassword}
                        onToggle={() => setShowPassword(v => !v)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {mode === "edit"
                          ? "Only fill this in to change the employee's login password."
                          : "Used to sign in with the work email above. Leave blank to use Welcome@123."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 grid md:grid-cols-2 gap-6">
                    {[0,1].map(i => (
                      <div key={i} className="space-y-3 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">{i===0?"Current Address":"Permanent Address"}</div>
                          {i === 1 && (
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sameAsPresent}
                                onChange={(e) => {
                                  setSameAsPresent(e.target.checked);
                                  if (e.target.checked) {
                                    const present = methods.getValues("addresses.0");
                                    (["line1","line2","city","state","country","pincode"] as const).forEach(f =>
                                      methods.setValue(`addresses.1.${f}`, present[f])
                                    );
                                  }
                                }}
                              />
                              Permanent Address same as Current Address
                            </label>
                          )}
                        </div>
                        <TextField name={`addresses.${i}.line1`} label="Address Line 1 *" disabled={i===1 && sameAsPresent}/>
                        <TextField name={`addresses.${i}.line2`} label="Address Line 2" disabled={i===1 && sameAsPresent}/>
                        <div className="grid grid-cols-2 gap-3">
                          <TextField name={`addresses.${i}.city`} label="City *" disabled={i===1 && sameAsPresent}/>
                          <TextField name={`addresses.${i}.state`} label="State *" disabled={i===1 && sameAsPresent}/>
                          <TextField name={`addresses.${i}.country`} label="Country *" disabled={i===1 && sameAsPresent}/>
                          <TextField name={`addresses.${i}.pincode`} label="Pincode *" disabled={i===1 && sameAsPresent}/>
                        </div>
                      </div>
                    ))}
                  </div>

                  <SectionHeader>Dependents</SectionHeader>
                  <div className="space-y-3">
                    {depFA.fields.map((f, i) => (
                      <div key={f.id} className="p-4 border border-slate-200 rounded-lg grid md:grid-cols-5 gap-3 relative">
                        <TextField name={`dependents.${i}.name`} label="Name *"/>
                        <SelectField name={`dependents.${i}.relationship_type`} label="Relationship">
                          <option value="">—</option>{["Spouse","Child","Father","Mother","Sibling","Other"].map(r=> <option key={r}>{r}</option>)}
                        </SelectField>
                        <TextField name={`dependents.${i}.date_of_birth`} label="Date of Birth" type="date"/>
                        <SelectField name={`dependents.${i}.gender`} label="Gender">
                          <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                        </SelectField>
                        <button type="button" onClick={() => depFA.remove(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => depFA.append({ name:"", relationship_type:"", date_of_birth:"", gender:"", is_dependent: true } as any)}><Plus className="h-4 w-4"/>Add Dependent</Button>
                  </div>

                  <SectionHeader>Emergency Contacts</SectionHeader>
                  <div className="space-y-3">
                    {emgFA.fields.map((f, i) => (
                      <div key={f.id} className="p-4 border border-slate-200 rounded-lg grid md:grid-cols-4 gap-3 relative">
                        <TextField name={`emergency_contacts.${i}.name`} label="Name *"/>
                        <TextField name={`emergency_contacts.${i}.relationship_type`} label="Relationship"/>
                        <TextField name={`emergency_contacts.${i}.mobile`} label="Mobile"/>
                        <TextField name={`emergency_contacts.${i}.address`} label="Address"/>
                        <button type="button" onClick={() => emgFA.remove(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => emgFA.append({ name:"", relationship_type:"", mobile:"", address:"" } as any)}><Plus className="h-4 w-4"/>Add Contact</Button>
                  </div>
                </TabsContent>

                {/* JOB & COMPENSATION */}
                <TabsContent value="job">
                  <SectionHeader first>Job Details</SectionHeader>
                  <div className="grid md:grid-cols-3 gap-4">
                    <SelectField name="department_id" label="Department *">
                      <option value="">—</option>
                      {meta.depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </SelectField>
                    <SelectField name="designation_id" label="Designation *">
                      <option value="">—</option>
                      {meta.desigs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </SelectField>
                    <SelectField name="employee_type" label="Employee Type">
                      {["Permanent","Contract","Intern","Trainee","Consultant","Freelancer"].map(t=> <option key={t}>{t}</option>)}
                    </SelectField>
                    <TextField name="date_of_joining" label="Date of Joining *" type="date"/>
                    <TextField name="probation_end_date" label="Probation End" type="date"/>
                    <TextField name="confirmation_date" label="Confirmation Date" type="date"/>
                    <SelectField name="reporting_manager_id" label="Reporting Manager">
                      <option value="">—</option>
                      {meta.managers.filter(m => m.id !== employeeId).map(m => <option key={m.id} value={m.id}>{m.emp_code} - {m.first_name} {m.last_name}</option>)}
                    </SelectField>
                    <SelectField name="work_location_id" label="Work Location *">
                      <option value="">—</option>{meta.locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </SelectField>
                    <SelectField name="shift_id" label="Shift">
                      <option value="">—</option>{meta.shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}
                    </SelectField>
                    <SelectField name="source_of_hire" label="Source of Hire">
                      <option value="">—</option>{["Referral","LinkedIn","Naukri","Indeed","Direct","Agency","Walk-in"].map(s=> <option key={s}>{s}</option>)}
                    </SelectField>
                    <TextField name="tags" label="Tags (comma-separated)"/>
                    <SelectField name="status" label="Status">
                      {["Active","On Leave","Inactive","Resigned","Terminated"].map(s=> <option key={s}>{s}</option>)}
                    </SelectField>
                    <TextField name="exit_date" label="Exit Date" type="date"/>
                  </div>

                  <SectionHeader>Compensation & Statutory (India)</SectionHeader>
                  <div className="grid md:grid-cols-3 gap-4">
                    <TextField name="ctc" label="CTC (Annual)" type="number"/>
                    <SelectField name="pay_frequency" label="Pay Frequency">
                      {["Monthly","Weekly","Bi-Weekly","Hourly"].map(p=> <option key={p}>{p}</option>)}
                    </SelectField>
                  </div>
                  <div className="mt-6">
                    <div className="text-sm font-semibold text-slate-900 mb-3">Bank Details</div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <TextField name="bank_name" label="Bank Name"/>
                      <TextField name="bank_account_no" label="Account Number"/>
                      <TextField name="bank_ifsc" label="IFSC Code"/>
                      <TextField name="bank_branch" label="Branch"/>
                      <SelectField name="bank_account_type" label="Account Type">
                        <option value="">—</option><option>Savings</option><option>Current</option>
                      </SelectField>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="text-sm font-semibold text-slate-900 mb-3">Statutory Documents</div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <TextField name="pan_number" label="PAN"/>
                        <StatutoryDocUpload docType="PAN" file={statutoryFiles.PAN}
                          existing={(initialValues as any)?.documents?.find?.((d: any) => d.doc_type === "PAN")}
                          onSelect={(f) => setStatutoryFiles(s => ({ ...s, PAN: f }))}/>
                      </div>
                      <div>
                        <TextField name="aadhaar_number" label="Aadhaar"/>
                        <StatutoryDocUpload docType="Aadhaar" file={statutoryFiles.Aadhaar}
                          existing={(initialValues as any)?.documents?.find?.((d: any) => d.doc_type === "Aadhaar")}
                          onSelect={(f) => setStatutoryFiles(s => ({ ...s, Aadhaar: f }))}/>
                      </div>
                      <TextField name="uan_number" label="UAN"/>
                      <TextField name="pf_number" label="PF Number"/>
                      <TextField name="esi_number" label="ESI Number"/>
                      <div>
                        <TextField name="passport_number" label="Passport Number"/>
                        <StatutoryDocUpload docType="Passport" file={statutoryFiles.Passport}
                          existing={(initialValues as any)?.documents?.find?.((d: any) => d.doc_type === "Passport")}
                          onSelect={(f) => setStatutoryFiles(s => ({ ...s, Passport: f }))}/>
                      </div>
                      <TextField name="passport_expiry" label="Passport Expiry" type="date"/>
                    </div>
                  </div>

                  <SectionHeader>Other Documents</SectionHeader>
                  <input
                    id="employee-document-file-form"
                    type="file"
                    className="sr-only"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      setDocFile(selected);
                      if (selected) {
                        const lower = selected.name.toLowerCase();
                        if (lower.includes("aadhaar")) setDocType("Aadhaar");
                        else if (lower.includes("pan")) setDocType("PAN");
                        else if (lower.includes("passport")) setDocType("Passport");
                        else if (lower.includes("resume")) setDocType("Resume");
                        else if (lower.includes("offer")) setDocType("OfferLetter");
                        else if (lower.includes("certificate")) setDocType("Certificate");
                      }
                    }}
                  />
                  <label
                    htmlFor="employee-document-file-form"
                    className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-200 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
                  >
                    <Upload className="h-10 w-10 mx-auto text-slate-400"/>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {docFile ? docFile.name : "Documents are uploaded after saving the employee."}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {docFile ? `${docType} selected. Save the employee to upload this document.` : "Click here to choose Resume, Offer Letter, or another Certificate."}
                    </p>
                  </label>
                  <div className="mt-4">
                    <Label>Notes</Label>
                    <Textarea rows={4} {...methods.register("notes")} placeholder="Any internal notes about this employee…"/>
                  </div>
                </TabsContent>

                {/* EDUCATION & EXPERIENCE */}
                <TabsContent value="background">
                  <SectionHeader first>Education</SectionHeader>
                  <div className="space-y-3">
                    {eduFA.fields.map((f, i) => (
                      <div key={f.id} className="p-4 border border-slate-200 rounded-lg grid md:grid-cols-6 gap-3 relative">
                        <div className="md:col-span-2"><TextField name={`education.${i}.institute`} label="Institute"/></div>
                        <TextField name={`education.${i}.degree`} label="Degree"/>
                        <TextField name={`education.${i}.specialization`} label="Specialization"/>
                        <TextField name={`education.${i}.year_from`} label="From" type="number"/>
                        <TextField name={`education.${i}.year_to`} label="To" type="number"/>
                        <TextField name={`education.${i}.grade`} label="Grade"/>
                        <div className="md:col-span-6">
                          <RowFileUpload
                            id={`edu-file-${f.id}`}
                            label="Upload Certificate"
                            file={eduFiles[i]}
                            existingUrl={methods.watch(`education.${i}.file_url`)}
                            existingName={methods.watch(`education.${i}.file_name`)}
                            onSelect={(file) => setEduFiles(s => ({ ...s, [i]: file }))}
                          />
                        </div>
                        <button type="button" onClick={() => removeEdu(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => eduFA.append({ institute:"", degree:"", specialization:"", grade:"" } as any)}><Plus className="h-4 w-4"/>Add Education</Button>
                  </div>

                  <SectionHeader>Past Experience</SectionHeader>
                  <div className="space-y-3">
                    {expFA.fields.map((f, i) => (
                      <div key={f.id} className="p-4 border border-slate-200 rounded-lg grid md:grid-cols-4 gap-3 relative">
                        <TextField name={`experience.${i}.company_name`} label="Company"/>
                        <TextField name={`experience.${i}.designation`} label="Designation"/>
                        <TextField name={`experience.${i}.from_date`} label="From" type="date"/>
                        <TextField name={`experience.${i}.to_date`} label="To" type="date"/>
                        <div className="md:col-span-4">
                          <Label>Description</Label>
                          <Textarea {...methods.register(`experience.${i}.description`)}/>
                        </div>
                        <div className="md:col-span-4">
                          <RowFileUpload
                            id={`exp-file-${f.id}`}
                            label="Upload Relieving/Experience Letter"
                            file={expFiles[i]}
                            existingUrl={methods.watch(`experience.${i}.file_url`)}
                            existingName={methods.watch(`experience.${i}.file_name`)}
                            onSelect={(file) => setExpFiles(s => ({ ...s, [i]: file }))}
                          />
                        </div>
                        <button type="button" onClick={() => removeExp(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => expFA.append({ company_name:"", designation:"", from_date:"", to_date:"", description:"" } as any)}><Plus className="h-4 w-4"/>Add Experience</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </>
  );
}
