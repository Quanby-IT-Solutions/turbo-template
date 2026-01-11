import { NextRequest, NextResponse } from "next/server"

import { uploadDocument } from "@/core/lib/storage"

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params

		// Get the form data
		const formData = await request.formData()
		const file = formData.get("file") as File

		if (!file) {
			return NextResponse.json(
				{ error: { message: "No file provided" } },
				{ status: 400 },
			)
		}

		// Validate file size (e.g., 10MB limit)
		const maxSize = 10 * 1024 * 1024 // 10MB
		if (file.size > maxSize) {
			return NextResponse.json(
				{ error: { message: "File size exceeds 10MB limit" } },
				{ status: 400 },
			)
		}

		// Upload the file (automatically uses Supabase or local storage)
		const uploadResult = await uploadDocument(file, id)

		return NextResponse.json({
			success: true,
			data: {
				path: uploadResult.path,
				url: uploadResult.url,
				storageType: uploadResult.storageType,
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
			},
		})
	} catch (error) {
		console.error("Upload error:", error)
		return NextResponse.json(
			{
				error: {
					message:
						error instanceof Error
							? error.message
							: "Failed to upload document",
				},
			},
			{ status: 500 },
		)
	}
}
