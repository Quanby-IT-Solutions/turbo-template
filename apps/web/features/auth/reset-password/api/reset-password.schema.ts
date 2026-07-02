import { z } from "zod"

export const ResetPasswordSchema = z
	.object({
		newPassword: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine(data => data.confirmPassword === data.newPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})

export type ResetPassword = z.infer<typeof ResetPasswordSchema>
