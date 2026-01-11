import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common"
import { Observable } from "rxjs"
import { map } from "rxjs/operators"

export interface Response<T> {
	success: boolean
	message: string
	data?: T
	error?: string
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
	intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
		return next.handle().pipe(
			map(data => {
				// If response already has success field, return as is
				if (data && typeof data === "object" && "success" in data) {
					return data
				}

				// Otherwise wrap in standard response format
				return {
					success: true,
					message: "Operation successful",
					data,
				}
			})
		)
	}
}
