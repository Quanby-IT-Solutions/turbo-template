import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common"
import { Observable } from "rxjs"
import { tap } from "rxjs/operators"

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LoggingInterceptor.name)

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest()
		const { method, url, ip } = request
		const now = Date.now()

		return next.handle().pipe(
			tap({
				next: () => {
					const response = context.switchToHttp().getResponse()
					const { statusCode } = response
					const delay = Date.now() - now
					this.logger.log(`${method} ${url} ${statusCode} - ${delay}ms - ${ip}`)
				},
				error: error => {
					const delay = Date.now() - now
					this.logger.error(
						`${method} ${url} - ${delay}ms - ${ip} - Error: ${error.message}`
					)
				},
			})
		)
	}
}
