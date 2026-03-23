import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract"

import { type v1Contract } from "@repo/contracts"

export type V1Inputs = InferContractRouterInputs<typeof v1Contract>
export type V1Outputs = InferContractRouterOutputs<typeof v1Contract>
