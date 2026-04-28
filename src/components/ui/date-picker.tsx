"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // YYYY-MM-DD string
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  clearable = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? new Date(value + "T12:00:00") : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      onChange(`${yyyy}-${mm}-${dd}`);
    }
    setOpen(false);
  };

  const displayValue = selectedDate
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "America/New_York",
      }).format(selectedDate)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "inline-flex h-10 w-full items-center justify-between rounded-lg border border-[#e8e0d4] bg-white px-3 text-sm transition-colors",
          "hover:border-[#d4c5a9] focus-visible:border-[#b8860b] focus-visible:ring-2 focus-visible:ring-[#b8860b]/20 focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
          !displayValue && "text-[#9a8c7a]",
          displayValue && "text-[#1a1a1a]",
          className
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarDays className="h-4 w-4 text-[#9a8c7a] shrink-0" />
          {displayValue || placeholder}
        </span>
        {clearable && value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="ml-1 rounded-full p-0.5 hover:bg-[#f5f0e8] transition-colors"
          >
            <X className="h-3.5 w-3.5 text-[#9a8c7a]" />
          </button>
        ) : (
          <ChevronRight className="h-4 w-4 text-[#9a8c7a] shrink-0 opacity-50" />
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto p-0 bg-white border border-[#e8e0d4] shadow-lg shadow-[#0f1c2e]/8 rounded-xl"
      >
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
          showOutsideDays
          classNames={{
            root: "p-4",
            months: "flex flex-col",
            month: "space-y-3",
            month_caption: "flex justify-center relative items-center h-8",
            caption_label: "text-sm font-semibold text-[#1a1a1a] tracking-wide",
            nav: "flex items-center gap-1 absolute inset-x-0 top-0",
            button_previous: cn(
              "absolute left-0 inline-flex h-8 w-8 items-center justify-center rounded-lg",
              "text-[#9a8c7a] hover:bg-[#faf8f5] hover:text-[#1a1a1a] transition-colors"
            ),
            button_next: cn(
              "absolute right-0 inline-flex h-8 w-8 items-center justify-center rounded-lg",
              "text-[#9a8c7a] hover:bg-[#faf8f5] hover:text-[#1a1a1a] transition-colors"
            ),
            weekdays: "flex",
            weekday:
              "w-9 text-[11px] font-medium text-[#9a8c7a] uppercase tracking-wider text-center",
            week: "flex mt-1",
            day: "relative p-0 text-center focus-within:relative",
            day_button: cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-normal transition-all",
              "text-[#4a4a4a] hover:bg-[#faf8f5] hover:text-[#1a1a1a]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8860b]/30"
            ),
            selected:
              "!bg-[#0f1c2e] !text-white !rounded-lg !font-medium [&>button]:!bg-[#0f1c2e] [&>button]:!text-white [&>button]:hover:!bg-[#1a2d45]",
            today:
              "[&>button]:font-semibold [&>button]:text-[#b8860b] [&>button]:ring-1 [&>button]:ring-[#b8860b]/30 [&>button]:rounded-lg",
            outside: "[&>button]:text-[#d4c5a9] [&>button]:hover:text-[#9a8c7a]",
            disabled: "[&>button]:text-[#e8e0d4] [&>button]:pointer-events-none",
            hidden: "invisible",
          }}
          components={{
            Chevron: ({ orientation }) =>
              orientation === "left" ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              ),
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
