"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ScoreInfoProps = {
  title: string;
  meaning: string;
  calculation: string;
};

export function ScoreInfo({ title, meaning, calculation }: ScoreInfoProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Explain ${title}`}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Info className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-xl border-blue-100 bg-white p-4 shadow-xl">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <div className="mt-3 space-y-3 text-xs leading-5 text-slate-600">
          <div><b className="text-slate-800">What it means:</b> {meaning}</div>
          <div><b className="text-slate-800">How it is calculated:</b> {calculation}</div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
