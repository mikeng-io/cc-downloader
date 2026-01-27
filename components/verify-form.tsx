"use client";

import { useState, useRef, useEffect } from "react";

interface VerifyFormProps {
  email: string;
}

export function VerifyForm({ email }: VerifyFormProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newCode.every((digit) => digit !== "")) {
      handleSubmit(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (verificationCode: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Create form and submit
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/verify/auth";

    const emailInput = document.createElement("input");
    emailInput.type = "hidden";
    emailInput.name = "email";
    emailInput.value = email;

    const codeInput = document.createElement("input");
    codeInput.type = "hidden";
    codeInput.name = "code";
    codeInput.value = verificationCode;

    form.appendChild(emailInput);
    form.appendChild(codeInput);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <form
      action="/verify/auth"
      method="POST"
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fullCode = code.join("");
        if (fullCode.length === 6) {
          handleSubmit(fullCode);
        }
      }}
    >
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="code" value={code.join("")} />

      <div className="flex justify-center gap-2">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            className="w-12 h-14 text-center text-2xl font-bold border-2 border-outline rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface"
            disabled={isSubmitting}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={code.some((d) => d === "") || isSubmitting}
        className="w-full h-12 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? "Verifying..." : "Verify Email"}
      </button>

      <p className="text-xs text-center text-on-surface-variant">
        The code expires in 15 minutes
      </p>
    </form>
  );
}
