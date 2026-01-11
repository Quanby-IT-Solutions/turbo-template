import { createClient } from "@supabase/supabase-js"
import { existsSync, mkdir, writeFile } from "fs/promises"
import { join } from "path"

const UPLOAD_FOLDER = "uploads"
const BUCKET_NAME = "documents" // Default Supabase bucket name

// Check if Supabase is configured
function isSupabaseConfigured(): boolean {
	return !!(
		process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	)
}

// Get Supabase client
function getSupabaseClient() {
	if (!isSupabaseConfigured()) {
		return null
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

	return createClient(supabaseUrl, supabaseAnonKey)
}

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
	const uploadPath = join(process.cwd(), UPLOAD_FOLDER)
	if (!existsSync(uploadPath)) {
		await mkdir(uploadPath, { recursive: true })
	}
}

// Generate unique filename
function generateFileName(originalName: string): string {
	const timestamp = Date.now()
	const randomString = Math.random().toString(36).substring(2, 15)
	const extension = originalName.split(".").pop()
	const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "")
	return `${nameWithoutExt}-${timestamp}-${randomString}.${extension}`
}

// Upload to Supabase Storage
async function uploadToSupabase(
	file: File,
	fileName: string,
	documentId: string,
): Promise<{ path: string; url: string }> {
	const supabase = getSupabaseClient()
	if (!supabase) {
		throw new Error("Supabase is not configured")
	}

	const filePath = `${documentId}/${fileName}`
	const arrayBuffer = await file.arrayBuffer()
	const buffer = Buffer.from(arrayBuffer)

	const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
		contentType: file.type,
		upsert: false,
	})

	if (error) {
		throw new Error(`Failed to upload to Supabase: ${error.message}`)
	}

	// Get public URL
	const {
		data: { publicUrl },
	} = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)

	return {
		path: filePath,
		url: publicUrl,
	}
}

// Upload to local storage
async function uploadToLocal(
	file: File,
	fileName: string,
	documentId: string,
): Promise<{ path: string; url: string }> {
	await ensureUploadDir()

	const documentFolder = join(process.cwd(), UPLOAD_FOLDER, documentId)
	if (!existsSync(documentFolder)) {
		await mkdir(documentFolder, { recursive: true })
	}

	const filePath = join(documentFolder, fileName)
	const arrayBuffer = await file.arrayBuffer()
	const buffer = Buffer.from(arrayBuffer)

	await writeFile(filePath, buffer)

	// Return relative URL path
	const url = `/${UPLOAD_FOLDER}/${documentId}/${fileName}`

	return {
		path: filePath,
		url,
	}
}

// Main upload function - automatically chooses Supabase or local
export async function uploadDocument(
	file: File,
	documentId: string,
): Promise<{ path: string; url: string; storageType: "supabase" | "local" }> {
	const fileName = generateFileName(file.name)

	if (isSupabaseConfigured()) {
		const result = await uploadToSupabase(file, fileName, documentId)
		return {
			...result,
			storageType: "supabase",
		}
	} else {
		const result = await uploadToLocal(file, fileName, documentId)
		return {
			...result,
			storageType: "local",
		}
	}
}

// Delete from Supabase
async function deleteFromSupabase(filePath: string): Promise<void> {
	const supabase = getSupabaseClient()
	if (!supabase) {
		throw new Error("Supabase is not configured")
	}

	const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath])

	if (error) {
		throw new Error(`Failed to delete from Supabase: ${error.message}`)
	}
}

// Delete from local storage
async function deleteFromLocal(filePath: string): Promise<void> {
	const { unlink } = await import("fs/promises")
	await unlink(filePath)
}

// Main delete function
export async function deleteDocument(
	filePath: string,
	storageType: "supabase" | "local",
): Promise<void> {
	if (storageType === "supabase") {
		await deleteFromSupabase(filePath)
	} else {
		await deleteFromLocal(filePath)
	}
}
