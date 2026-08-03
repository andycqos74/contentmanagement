"use client";

import { nanoid } from "nanoid";
import { Plus, Trash2 } from "lucide-react";
import {
  ColorField,
  RangeField,
  SelectField,
  TextField,
  ToggleField,
} from "@/components/admin/fields";
import type { CookieCategory, CookieConsentSettings } from "@/lib/widgets/registry";

export function CookieConsentForm({
  settings,
  set,
  section,
}: {
  settings: CookieConsentSettings;
  set: (patch: Partial<CookieConsentSettings>) => void;
  section: "content" | "design";
}) {
  if (section === "design") {
    return (
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Position"
          value={settings.position}
          onChange={(v) => set({ position: v })}
          options={[
            { value: "bottom", label: "Fixed bottom" },
            { value: "top", label: "Fixed top" },
            { value: "bottom-left", label: "Bottom-left box" },
            { value: "bottom-right", label: "Bottom-right box" },
          ]}
        />
        <SelectField
          label="Layout"
          value={settings.layout}
          onChange={(v) => set({ layout: v })}
          options={[
            { value: "bar", label: "Bar" },
            { value: "box", label: "Box" },
          ]}
        />
        <ColorField label="Background" value={settings.bgColor} onChange={(v) => set({ bgColor: v })} />
        <ColorField label="Text" value={settings.textColor} onChange={(v) => set({ textColor: v })} />
        <ColorField label="Accent / accept" value={settings.accentColor} onChange={(v) => set({ accentColor: v })} />
        <ColorField
          label="Button text"
          value={settings.buttonTextColor}
          onChange={(v) => set({ buttonTextColor: v })}
        />
        <RangeField label="Corner radius" min={0} max={32} value={settings.rounded} onChange={(v) => set({ rounded: v })} suffix="px" />
        <TextField
          label="Consent version"
          value={settings.version}
          onChange={(v) => set({ version: v })}
          hint="Change this to re-ask everyone (e.g. after updating your policy)."
        />
      </div>
    );
  }

  const cats = settings.categories;
  const patchCat = (i: number, p: Partial<CookieCategory>) =>
    set({ categories: cats.map((c, idx) => (idx === i ? { ...c, ...p } : c)) });
  const addCat = () =>
    set({
      categories: [...cats, { key: nanoid(6), label: "New category", description: "", required: false }],
    });
  const removeCat = (i: number) => set({ categories: cats.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <TextField label="Title" value={settings.title} onChange={(v) => set({ title: v })} />
      <TextField label="Message" value={settings.message} onChange={(v) => set({ message: v })} textarea />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Policy link text" value={settings.policyText} onChange={(v) => set({ policyText: v })} />
        <TextField label="Policy URL" value={settings.policyUrl} onChange={(v) => set({ policyUrl: v })} placeholder="https://…" />
        <TextField label="Accept button" value={settings.acceptText} onChange={(v) => set({ acceptText: v })} />
        <TextField label="Reject button" value={settings.rejectText} onChange={(v) => set({ rejectText: v })} />
        <TextField label="Manage button" value={settings.customizeText} onChange={(v) => set({ customizeText: v })} />
        <TextField label="Save button" value={settings.saveText} onChange={(v) => set({ saveText: v })} />
      </div>
      <div className="rounded-md border border-slate-200 p-2">
        <ToggleField label="Show 'Reject all'" value={settings.showReject} onChange={(v) => set({ showReject: v })} />
        <ToggleField label="Show 'Manage preferences'" value={settings.showCustomize} onChange={(v) => set({ showCustomize: v })} />
        <ToggleField label="Show reopener button after choice" value={settings.showReopen} onChange={(v) => set({ showReopen: v })} />
      </div>
      {settings.showReopen && (
        <TextField label="Reopener label" value={settings.reopenText} onChange={(v) => set({ reopenText: v })} />
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Cookie categories
        </p>
        <div className="space-y-2">
          {cats.map((c, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  #{i + 1}
                  {c.required ? " · essential" : ""}
                </span>
                {!c.required && (
                  <button
                    type="button"
                    onClick={() => removeCat(i)}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <TextField label="Label" value={c.label} onChange={(v) => patchCat(i, { label: v })} />
              <TextField
                label="Description"
                value={c.description}
                onChange={(v) => patchCat(i, { description: v })}
              />
              <ToggleField
                label="Always on (essential)"
                value={c.required}
                onChange={(v) => patchCat(i, { required: v })}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addCat}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={13} /> Add category
          </button>
        </div>
      </div>
    </div>
  );
}
