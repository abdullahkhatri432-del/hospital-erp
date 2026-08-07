"use client";

import * as React from "react";
import {
  Activity,
  CalendarClock,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Overview } from "@/components/modules/overview";
import { Patients } from "@/components/modules/patients";
import { Pharmacy } from "@/components/modules/pharmacy";
import {
  Appointments,
  Billing,
  Doctors,
  Insurance,
  Laboratory,
} from "@/components/modules/operations";

type ModuleId =
  | "overview"
  | "patients"
  | "appointments"
  | "pharmacy"
  | "laboratory"
  | "billing"
  | "insurance"
  | "doctors";

const MODULES: {
  id: ModuleId;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Clinical" },
  { id: "patients", label: "Patients", icon: Users, group: "Clinical" },
  { id: "appointments", label: "Appointments", icon: CalendarClock, group: "Clinical" },
  { id: "laboratory", label: "Laboratory", icon: FlaskConical, group: "Clinical" },
  { id: "pharmacy", label: "Pharmacy", icon: Pill, group: "Operations" },
  { id: "billing", label: "Billing", icon: CreditCard, group: "Operations" },
  { id: "insurance", label: "Insurance", icon: ShieldCheck, group: "Operations" },
  { id: "doctors", label: "Medical staff", icon: Stethoscope, group: "Operations" },
];

const TITLES: Record<ModuleId, { title: string; subtitle: string }> = {
  overview: {
    title: "Clinical Overview",
    subtitle: "Deterioration watchlist and operational alerts",
  },
  patients: {
    title: "Patients",
    subtitle: "Register, clinical records and observation history",
  },
  appointments: {
    title: "Appointments",
    subtitle: "Scheduling across all departments",
  },
  laboratory: {
    title: "Laboratory",
    subtitle: "Order workflow and reported results",
  },
  pharmacy: {
    title: "Pharmacy",
    subtitle: "Prescribing safety checks and inventory",
  },
  billing: { title: "Billing", subtitle: "Invoicing and revenue" },
  insurance: { title: "Insurance", subtitle: "Claim submission and settlement" },
  doctors: { title: "Medical Staff", subtitle: "Consultants and availability" },
};

export function ErpShell() {
  const [active, setActive] = React.useState<ModuleId>("overview");
  const [navOpen, setNavOpen] = React.useState(false);

  const groups = React.useMemo(() => {
    const map = new Map<string, typeof MODULES>();
    for (const item of MODULES) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, []);

  const renderModule = () => {
    switch (active) {
      case "overview":
        return <Overview />;
      case "patients":
        return <Patients />;
      case "appointments":
        return <Appointments />;
      case "laboratory":
        return <Laboratory />;
      case "pharmacy":
        return <Pharmacy />;
      case "billing":
        return <Billing />;
      case "insurance":
        return <Insurance />;
      case "doctors":
        return <Doctors />;
    }
  };

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-white/8 bg-surface transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-white/8 px-5 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-teal-500">
            <Activity className="size-4 text-white" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Meridian</p>
            <p className="text-[10px] text-subtle">Hospital ERP</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Modules">
          {groups.map(([group, modules]) => (
            <div key={group} className="mb-4">
              <p className="px-3 py-1.5 text-[10px] font-medium tracking-wider text-subtle uppercase">
                {group}
              </p>
              <ul className="space-y-0.5">
                {modules.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActive(item.id);
                          setNavOpen(false);
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-sky-500/12 text-sky-300"
                            : "text-muted hover:bg-white/5 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/8 p-4">
          <p className="text-[10px] leading-relaxed text-subtle">
            Demonstration system. All patient records are fictional.
          </p>
        </div>
      </aside>

      {/* Backdrop for mobile nav */}
      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/8 bg-background/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-5 py-4">
            <button
              type="button"
              onClick={() => setNavOpen((value) => !value)}
              aria-label="Toggle navigation"
              className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-muted lg:hidden"
            >
              {navOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-foreground">
                {TITLES[active].title}
              </h1>
              <p className="truncate text-xs text-subtle">
                {TITLES[active].subtitle}
              </p>
            </div>

            <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1 text-[10px] text-emerald-300 sm:flex">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              Systems nominal
            </span>
          </div>
        </header>

        <main className="flex-1 p-5">{renderModule()}</main>
      </div>
    </div>
  );
}
