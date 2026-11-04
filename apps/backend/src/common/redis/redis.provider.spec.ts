import { once } from "node:events"
import { createServer, type AddressInfo, type Server, type Socket } from "node:net"
import Redis from "ioredis"

import { redisClientOptions } from "./redis.provider"

/**
 * A Redis that answers the connection's ready check (INFO) and then never
 * answers again: a frozen process or a partition after connect. Measured
 * 11/4: without a command timeout every request hung, health check included.
 */
async function hungAfterConnect(): Promise<{ server: Server; port: number; commands: string[] }> {
	const sockets: Socket[] = []
	const commands: string[] = []
	const server = createServer(socket => {
		sockets.push(socket)
		let ready = false
		socket.on("data", chunk => {
			// Each RESP command starts "*<n>\r\n$<len>\r\n<NAME>"; answer the
			// handshake (CLIENT SETINFO, INFO), then nothing ever again.
			for (const [, name] of chunk
				.toString("utf8")
				.matchAll(/\*\d+\r\n\$\d+\r\n([A-Za-z]+)\r\n/g)) {
				commands.push(String(name).toUpperCase())
				if (ready) continue
				if (String(name).toUpperCase() === "INFO") {
					const info = "# Server\r\nredis_version:7.4.0\r\nloading:0\r\n"
					socket.write(`$${Buffer.byteLength(info)}\r\n${info}\r\n`)
					ready = true
				} else {
					socket.write("+OK\r\n")
				}
			}
		})
	})
	server.on("close", () => sockets.forEach(socket => socket.destroy()))
	server.listen(0, "127.0.0.1")
	await once(server, "listening")
	return { server, port: (server.address() as AddressInfo).port, commands }
}

/** Resolves with `value`'s outcome, or with "still waiting" after `ms`. */
function within<T>(value: Promise<T>, ms: number): Promise<T | Error | "still waiting"> {
	return Promise.race([
		value.catch((error: unknown) => (error instanceof Error ? error : new Error(String(error)))),
		new Promise<"still waiting">(resolve => setTimeout(() => resolve("still waiting"), ms)),
	])
}

describe("redisClientOptions", () => {
	it("rejects a command Redis never answers instead of waiting forever", async () => {
		const { server, port, commands } = await hungAfterConnect()
		let client: Redis | undefined
		try {
			client = new Redis(`redis://127.0.0.1:${port}`, {
				...redisClientOptions("spec"),
				retryStrategy: () => null,
			})
			// Every wait is bounded, so a hang fails the test instead of stalling it
			// (an abandoned await would also skip the cleanup below).
			expect(await within(once(client, "ready"), 2_000)).not.toBe("still waiting")

			const outcome = await within(client.get("key"), 2_000)

			expect(commands).toContain("GET")
			expect(outcome).toBeInstanceOf(Error)
			expect((outcome as Error).message).toMatch(/timed out/i)
		} finally {
			client?.disconnect()
			server.close()
		}
	})
})
