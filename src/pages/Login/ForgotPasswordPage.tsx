// src/pages/ForgotPasswordPage.tsx
import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import LogoFull from "@/assets/icons/logo-full.png"

// White fields sit on the cream page; the border and focus ring use the brand green.
const fieldClass =
  "h-11 border-primary/25 bg-white focus-visible:border-primary focus-visible:ring-primary/20"

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Replace with your NestJS call:
      // const res = await fetch("/api/auth/forgot-password", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email }),
      // })
      // if (!res.ok) throw new Error("Request failed")

      // Pass the email along so the OTP page can show where the code was sent.
      navigate("/otp", { state: { email } })
    } catch {
      setError("We couldn't send a code. Check your email and try again.")
    } finally {
      setSubmitting(false)
    }
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
            Forgot password?
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-primary/70">
            Enter the email linked to your account and we'll send a code to
            verify it's you.
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
              <Label htmlFor="email" className="text-primary">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@school.edu.ph"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full bg-primary text-secondary hover:bg-primary/90"
            >
              {submitting ? "Sending…" : "Send verification code"}
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
