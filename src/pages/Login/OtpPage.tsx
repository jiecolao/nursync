// src/pages/OtpPage.tsx
import { useEffect, useRef, useState } from "react"
import type {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
} from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import LogoFull from "@/assets/icons/logo-full.png"

const CODE_LENGTH = 6
const RESEND_SECONDS = 30

// Same field treatment as the forgot-password page, sized for a single digit.
const digitClass =
  "h-12 w-full min-w-0 rounded-md border border-primary/25 bg-white text-center text-xl font-medium text-primary outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-primary/20 aria-invalid:border-red-400 aria-invalid:ring-red-200"

export default function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  // Resend countdown.
  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [secondsLeft])

  // Someone landing here directly has no email to verify, so send them back.
//   if (!email) return <Navigate to="/forgot-password" replace />

  const code = digits.join("")
  const isComplete = code.length === CODE_LENGTH

  function focusAt(index: number) {
    const i = Math.max(0, Math.min(CODE_LENGTH - 1, index))
    inputs.current[i]?.focus()
    inputs.current[i]?.select()
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1)
    setError(null)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit) focusAt(index + 1)
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index]) {
      e.preventDefault()
      setDigits((prev) => {
        const next = [...prev]
        next[index - 1] = ""
        return next
      })
      focusAt(index - 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      focusAt(index - 1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      focusAt(index + 1)
    }
  }

  // Pasting a full code fills every box at once.
  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH)
    if (!pasted) return
    setError(null)
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? ""))
    focusAt(pasted.length >= CODE_LENGTH ? CODE_LENGTH - 1 : pasted.length)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isComplete) return
    setError(null)
    setSubmitting(true)

    try {
      // Replace with your NestJS call:
      // const res = await fetch("/api/auth/verify-otp", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, code }),
      // })
      // if (!res.ok) throw new Error("Invalid code")
      // const { resetToken } = await res.json()

      navigate("/reset-pass", { state: { email, code } })
    } catch {
      setError("That code isn't right or has expired. Check it and try again.")
      setDigits(Array(CODE_LENGTH).fill(""))
      focusAt(0)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (secondsLeft > 0) return
    setError(null)
    setDigits(Array(CODE_LENGTH).fill(""))
    setSecondsLeft(RESEND_SECONDS)
    focusAt(0)

    // Replace with your NestJS call:
    // await fetch("/api/auth/forgot-password", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ email }),
    // })
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-secondary px-6 py-12">
      <div className="w-full max-w-md">
        <img
          src={LogoFull}
          alt="Nursync"
          className="mx-auto mb-8 h-20 w-auto rounded-xl object-contain"
        />

        <div className="rounded-2xl border border-primary/10 bg-white/50 p-6 text-center sm:p-8">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-primary">
            Check your email
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-primary/70">
            We sent a 6-digit code to{" "}
            <span className="break-all font-medium text-primary">{email}</span>
            . It expires in 10 minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5 text-left">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp-0" className="text-primary">
                Verification code
              </Label>
              <div
                role="group"
                aria-label="Verification code"
                className="grid grid-cols-6 gap-2 sm:gap-3"
              >
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    ref={(el) => {
                      inputs.current[i] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    autoFocus={i === 0}
                    maxLength={1}
                    value={digit}
                    aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    className={digitClass}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isComplete || submitting}
              className="h-11 w-full bg-primary text-secondary hover:bg-primary/90"
            >
              {submitting ? "Verifying…" : "Verify code"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-primary/70">
            Didn't get it?{" "}
            {secondsLeft > 0 ? (
              <span aria-live="polite">Resend in {secondsLeft}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Resend code
              </button>
            )}
          </p>

          <Link
            to="/forgot-pass"
            className="mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowLeft className="size-4" />
            Use a different email
          </Link>
        </div>
      </div>
    </main>
  )
}
