"use client";

import { useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TwoFactorInputProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  showBackupOption?: boolean;
  onBackupMode?: (isBackup: boolean) => void;
  isBackupMode?: boolean;
}

const CODE_LENGTH = 6;

export function TwoFactorInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  showBackupOption = false,
  onBackupMode,
  isBackupMode = false,
}: TwoFactorInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split the value into individual digits for each box
  const digits = value.split("").slice(0, CODE_LENGTH);
  while (digits.length < CODE_LENGTH) {
    digits.push("");
  }

  // Focus the first empty input on mount when autoFocus is true
  useEffect(() => {
    if (autoFocus && !isBackupMode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, isBackupMode]);

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < CODE_LENGTH) {
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  }, []);

  const updateCode = useCallback(
    (newDigits: string[]) => {
      onChange(newDigits.join("").slice(0, CODE_LENGTH));
    },
    [onChange]
  );

  const handleInput = useCallback(
    (index: number, inputValue: string) => {
      // Only allow digits
      const digit = inputValue.replace(/\D/g, "").slice(-1);
      if (!digit) return;

      const newDigits = [...digits];
      newDigits[index] = digit;
      updateCode(newDigits);

      // Auto-advance to next input
      if (index < CODE_LENGTH - 1) {
        focusInput(index + 1);
      }
    },
    [digits, updateCode, focusInput]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const newDigits = [...digits];

        if (digits[index]) {
          // Clear the current input
          newDigits[index] = "";
          updateCode(newDigits);
        } else if (index > 0) {
          // Move to previous input and clear it
          newDigits[index - 1] = "";
          updateCode(newDigits);
          focusInput(index - 1);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [digits, updateCode, focusInput]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
      if (!pastedData) return;

      const pastedDigits = pastedData.split("").slice(0, CODE_LENGTH);
      const newDigits = [...digits];
      for (let i = 0; i < pastedDigits.length; i++) {
        newDigits[i] = pastedDigits[i];
      }
      updateCode(newDigits);

      // Focus the input after the last pasted digit, or the last input
      const focusIndex = Math.min(pastedDigits.length, CODE_LENGTH - 1);
      focusInput(focusIndex);
    },
    [digits, updateCode, focusInput]
  );

  const handleFocus = useCallback(
    (index: number) => {
      // Select the content of the focused input
      inputRefs.current[index]?.select();
    },
    []
  );

  if (isBackupMode) {
    return (
      <div className="space-y-3">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder="Enter backup code"
          className="text-center font-mono tracking-wider"
        />
        {showBackupOption && onBackupMode && (
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                onChange("");
                onBackupMode(false);
              }}
              disabled={disabled}
            >
              Use authenticator code instead
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleInput(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => handleFocus(index)}
            className={cn(
              "h-12 w-10 rounded-lg border border-input bg-transparent text-center text-lg font-semibold tabular-nums transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-input/30"
            )}
            aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
          />
        ))}
      </div>
      {showBackupOption && onBackupMode && (
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              onChange("");
              onBackupMode(true);
            }}
            disabled={disabled}
          >
            Use backup code instead
          </Button>
        </div>
      )}
    </div>
  );
}
