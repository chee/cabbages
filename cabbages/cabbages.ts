import type {
	Patch as AutomergePatch,
	DocHandleChangePayload,
} from "@automerge/automerge-repo/slim"
import debug from "debug"
const log = debug("cabbages")

const inc = Symbol("inc")

/**
 * A way to describe move, copy, wrap, cherry-pick and rich text
 * @see https://braid.org/meeting-62/portals
 */
export interface Portal {
	start: number
	end: number
	path: PathPart[]
	referencing: PatchVersion
}

/*
 * potential for confusion: a PatchVersion is also the document version with
 * that patch applied?
 */

export type PatchVersion = string & {"patch-version": true}
export interface PatchSet {
	version: PatchVersion
	parents: PatchVersion[]
	mergeType: string
	patches: Patch[]
	meta: Record<string, string | number | (string | number)[]>
}

export type PathPart = number | string

type PatchType<T extends string> = T & {"patch-type": T}
function type<T extends string>(string: T) {
	return string as PatchType<T>
}

export type PatchRange = [number?, number?] | PathPart

type EmptyPatch = []

type Patch = [path: PathPart[], range: PatchRange, val?: any] | EmptyPatch

export function pojo(target: any): target is Record<string | number, any> {
	return (
		typeof target == "object" &&
		typeof target != null &&
		Object.getPrototypeOf(target) == Object.prototype
	)
}

/**
 * walk a path in an obj, optionally mutating it to insert missing parts for the
 * inspiration of @see
 * https://github.com/braid-org/braid-spec/blob/aea85367d60793c113bdb305a4b4ecf55d38061d/draft-toomim-httpbis-range-patch-01.txt
 *
 * to insert a string in an array, you need to wrap it in [] to insert an array
 *	in an array you need to wrap it in []
 */

export function apply(target: any, ...rest: Patch) {
	if (rest.length == 0) {
		log("empty patch")
		return
	}
	const [path, range, val] = rest
	let p = [...path]

	while (true) {
		let key = p.shift()
		if (!p.length) {
			const RANGE_ARRAY = Array.isArray(range)

			if (
				pojo(target) &&
				RANGE_ARRAY &&
				typeof key == "undefined" &&
				typeof range[0] == "string"
			) {
				delete target[range[0]]
				return
			}

			if (RANGE_ARRAY || typeof range == "number") {
				if (typeof key == "undefined") {
					throw new Error("cant treat top level as a seq")
				}

				key = key!
				// splice
				let [start, end] = Array.isArray(range) ? range : [range, range + 1]
				const ZERO_LENGTH = Array.isArray(range) && range.length == 0

				if (!ZERO_LENGTH && (start == null || end == null)) {
					throw new RangeError("it's all or nothing, no half measures")
				}
				const DELETE = typeof val == "undefined"
				const INSERT = start === end && !DELETE
				const APPEND = ZERO_LENGTH && !DELETE
				let op = DELETE
					? ("del" as const)
					: APPEND
					? ("add" as const)
					: INSERT
					? ("ins" as const)
					: ("replace" as const)

				if (typeof target[key] == "undefined") {
					// todo what if it's a function that would return a string?
					if (typeof val == "string") {
						target[key] = ""
					} else {
						target[key] = []
					}
				}
				let seq = target[key]

				if (Array.isArray(seq)) {
					switch (op) {
						case "add": {
							Array.isArray(val) ? seq.push(...val) : seq.push(val)
							return
						}
						case "replace":
						case "ins": {
							Array.isArray(val)
								? seq.splice(start!, end! - start!, ...val)
								: seq.splice(start!, end! - start!, val)
							return
						}
						case "del": {
							seq.splice(start!, end! - start!)
							return
						}
						default: {
							throw new Error("i don't know what happened")
						}
					}
				}

				if (typeof seq == "string") {
					switch (op) {
						case "add": {
							target[key] = seq + val
							return
						}
						case "replace":
						case "ins": {
							target[key] =
								seq.slice(0, start) +
								(typeof val == "string" ? val : val.join("")) +
								seq.slice(end)
							return
						}
						case "del": {
							target[key] = seq.slice(0, start) + seq.slice(end)
							return
						}
						default: {
							throw new Error("i don't know what happened")
						}
					}
				}

				if (pojo(seq) && RANGE_ARRAY && typeof range[0] == "string") {
					delete seq[range[0]]
				}

				// todo should impl for typed arrays?
				throw new Error("not implemented")
			}

			if (typeof key == "undefined") {
				if (typeof range != "string") {
					throw new Error(`can't index top-level map with ${range}`)
				}

				// put/delete
				if (typeof val == "undefined") {
					delete target[range]
				} else if (Array.isArray(val) && val[0] == inc) {
					target[range] += val[1]
				} else {
					target[range] = val
				}

				return
			}
			if (typeof target[key] == "undefined") {
				target[key] = {}
			}
			// put/delete
			if (RANGE_ARRAY) {
				let [a, b] = range
				if (a != null && b != null) {
					if (typeof val == "undefined" && a != null && b != null) {
						delete target[key][a || b]
					} else {
						target[key][a || b] = val
					}
				}
			} else {
				if (typeof val == "undefined") {
					delete target[key][range]
				} else if (Array.isArray(val) && val[0] == inc) {
					target[range] += val[1]
				} else {
					target[key][range] = val
				}
			}

			return
		}

		if (typeof key == "undefined") {
			throw new Error("cant treat top level as a seq")
		}

		key = key!
		let nextkey = p[0]
		if (typeof target[key] == "undefined") {
			if (typeof nextkey == "string") {
				target[key] = {}
			} else if (typeof nextkey == "number") {
				target[key] = []
			} else {
				throw new Error(`can't go down this road ${target}.${key}.${nextkey}`)
			}
		}

		target = target[key]
	}
}

export const patch = apply

function get(obj: object, key: (string | number)[]) {
	for (let p = 0; p < key.length; p++) {
		obj = obj ? obj[key[p]] : undefined
	}
	return obj
}

export function fromAutomerge(
	autopatch: AutomergePatch,
	payload?: DocHandleChangePayload<any>
): Patch {
	const path = autopatch.path.slice(0, -1)
	const key = autopatch.path[autopatch.path.length - 1]

	switch (autopatch.action) {
		case "mark":
		case "unmark":
			log(
				`skipping ${autopatch.action} because it doesn't affect material reality`
			)
			return []
		case "inc":
			if (payload) {
				return [path, key, get(payload.patchInfo.after, path)]
			} else {
				return [path, key, [inc, autopatch.value]]
			}
		case "conflict":
			if (payload) {
				return [path, key, get(payload.patchInfo.after, path)]
			} else {
				throw new Error(
					`can't apply ${autopatch.action} without payload argument`
				)
			}
		case "del": {
			return typeof key == "string"
				? [path, key]
				: [path, [key, key + (autopatch.length || 1)]]
		}
		case "insert": {
			return [path, [key as number, key as number], autopatch.values]
		}
		case "splice": {
			return [path, [key as number, key as number], [autopatch.value]]
		}
		case "put": {
			return [path, key!, autopatch.value]
		}
	}
}
