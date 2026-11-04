import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const useFeatureFlag = vi.fn()

vi.mock("@/core/hooks/use-feature-flag", () => ({
	useFeatureFlag: (key: string) => useFeatureFlag(key),
}))

const { FeaturePreviewBadge } = await import("./feature-preview-badge")

describe("FeaturePreviewBadge", () => {
	it("shows a Preview badge while template-preview is on", () => {
		useFeatureFlag.mockReturnValue(true)

		render(<FeaturePreviewBadge />)

		expect(screen.getByText("Preview")).toBeInTheDocument()
		expect(useFeatureFlag).toHaveBeenCalledWith("template-preview")
	})

	it("renders nothing while the flag is off", () => {
		useFeatureFlag.mockReturnValue(false)

		const { container } = render(<FeaturePreviewBadge />)

		expect(container).toBeEmptyDOMElement()
	})
})
