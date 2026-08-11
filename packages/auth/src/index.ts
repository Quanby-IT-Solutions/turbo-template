export {
	createAuth,
	getAuth,
	authEnv,
	AUTH_BASE_PATH,
	type Session as AuthSession,
} from "./config.js"
export {
	authSecretSchema,
	isPlaceholderSecret,
	AUTH_SECRET_MIN_LENGTH,
	PLACEHOLDER_SECRET_PREFIXES,
} from "./secret-schema.js"
export type { Session, User, Account, Verification } from "better-auth/types"
