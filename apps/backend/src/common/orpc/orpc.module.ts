import { Module } from "@nestjs/common"
import { ORPCModule } from "@orpc/nest"
import { type Request, type Response } from "express"

declare module "@orpc/nest" {
	interface ORPCGlobalContext {
		request: Request
		response: Response
	}
}

@Module({
	imports: [
		ORPCModule.forRootAsync({
			useFactory: () => ({
				context: (clientContext: object) => {
					const ctx = clientContext as { req: Request; res: Response }
					return {
						request: ctx.req,
						response: ctx.res,
					}
				},
			}),
		}),
	],
})
export class ORPCCommonModule {}
