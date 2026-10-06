// src/pages/ResetPasswordPage.tsx
import { useState } from "react"
import type { FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Circle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import LogoFull from "@/assets/icons/logo-full.png"

// White fields sit on the cream page; the border and focus ring use the brand green.
const fieldClass =
  "h-11 border-primary/25 bg-white pr-11 focus-visible:border-primary focus-visible:ring-primary/20"

const rules = [
  { label: "At least 12 characters", test: (v: string) => v.length >= 12 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { email?: string; code?: string } | null

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Without a verified code there is nothing to reset, so start over.
  if (!state?.email || !state?.code) {
    return <Navigate to="/forgot-password" replace />
  }

  const { email, code } = state
  const allRulesMet = rules.every((r) => r.test(password))
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = allRulesMet && password === confirm && !submitting

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)

    try {
      // Replace with your NestJS call:
      // const res = await fetch("/api/auth/reset-password", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, code, password }),
      // })
      // if (!res.ok) throw new Error("Reset failed")
      void email
      void code

      // Let the login page confirm the change.
      navigate("/login", { state: { passwordReset: true }, replace: true })
    } catch {
      setError(
        "We couldn't reset your password. Your code may have expired. Request a new one and try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const toggleLabel = showPassword ? "Hide passwords" : "Show passwords"

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
            Set a new password
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-primary/70">
            Your code is verified. Choose a new password for your account.
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
              <Label htmlFor="password" className="text-primary">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="password-rules"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={toggleLabel}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-primary/60 hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              <ul id="password-rules" className="space-y-1 pt-1">
                {rules.map((rule) => {
                  const met = rule.test(password)
                  return (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-2 text-sm ${
                        met ? "text-primary" : "text-primary/60"
                      }`}
                    >
                      {met ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        <Circle className="size-4" aria-hidden="true" />
                      )}
                      {rule.label}
                      <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-primary">
                Confirm new password
              </Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={mismatch || undefined}
                aria-describedby={mismatch ? "confirm-error" : undefined}
                className={`${fieldClass} aria-invalid:border-red-400 aria-invalid:ring-red-200`}
              />
              {mismatch && (
                <p id="confirm-error" className="text-sm text-red-800">
                  Passwords don't match.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-11 w-full bg-primary text-secondary hover:bg-primary/90"
            >
              {submitting ? "Saving…" : "Reset password"}
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowLeft className="size-4" />
            Back to log in
          </Link>
        </div>
      </div>
    </main>
  )
}
