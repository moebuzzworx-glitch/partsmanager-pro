"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useFirebase } from "@/firebase/provider"
import { resetPassword, verifyResetCode } from "@/firebase/auth-functions"
import { Loader2 } from "lucide-react"

const formSchema = z
  .object({
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export default function ResetPasswordConfirmPage({
  params: { locale, token },
}: {
  params: { locale: string; token: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const { auth } = useFirebase()
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValid, setIsValid] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  // Verify reset token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!auth || !token) {
        toast({
          title: dictionary?.errors?.title || "Error",
          description: dictionary?.invalidResetLinkError || "Invalid reset link. Please request a new password reset.",
          variant: "destructive",
        })
        setIsVerifying(false)
        return
      }

      try {
        await verifyResetCode(auth, token)
        setIsValid(true)
      } catch (error: any) {
        toast({
          title: dictionary?.errors?.title || "Error",
          description:
            error.message ||
            dictionary?.resetLinkExpired || "This password reset link is invalid or has expired.",
          variant: "destructive",
        })
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [auth, token, toast])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !token) return

    try {
      setIsLoading(true)
      await resetPassword(auth, token, values.password)
      toast({
        title: "Success",
        description: dictionary?.passwordResetSuccessMsg || "Your password has been reset. You can now log in.",
      })
      router.push(`/${locale}/login`)
    } catch (error: any) {
      console.error("Password reset error:", error)
      toast({
        title: dictionary?.errors?.title || "Error",
        description:
          error.message ||
          dictionary?.resetPasswordFailed || "Failed to reset password. Please request a new reset link.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-4 text-center">
            <h1 className="text-3xl font-bold">Invalid Reset Link</h1>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
            <Button
              className="w-full"
              onClick={() => router.push(`/${locale}/reset-password`)}
            >
              Request New Reset Link
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Create New Password</h1>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reset Password
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
