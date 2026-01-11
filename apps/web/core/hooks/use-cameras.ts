"use client"

import { useEffect, useRef, useState } from "react"

export interface CameraDevice {
	deviceId: string
	label: string
}

export function useCameras() {
	const [cameras, setCameras] = useState<CameraDevice[]>([])
	const [selectedCameraId, setSelectedCameraId] = useState<string>("")
	const [error, setError] = useState<string | null>(null)
	const hasInitialized = useRef(false)

	useEffect(() => {
		const getCameras = async () => {
			if (hasInitialized.current) return

			try {
				// Request permission first to get camera labels
				const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true })

				// Stop the permission stream immediately
				permissionStream.getTracks().forEach((track) => track.stop())

				const devices = await navigator.mediaDevices.enumerateDevices()
				const videoDevices = devices
					.filter((device) => device.kind === "videoinput")
					.map((device) => ({
						deviceId: device.deviceId,
						label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
					}))

				setCameras(videoDevices)

				if (videoDevices.length > 0 && !selectedCameraId) {
					setSelectedCameraId(videoDevices[0].deviceId)
				}

				setError(null)
				hasInitialized.current = true
			} catch (err: unknown) {
				console.error("Error getting cameras:", err)
				const message = err instanceof Error ? err.message : "Failed to access cameras"
				setError(message)
				hasInitialized.current = true
			}
		}

		getCameras()
	}, [selectedCameraId])

	return {
		cameras,
		selectedCameraId,
		setSelectedCameraId,
		error,
	}
}
