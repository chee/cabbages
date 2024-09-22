import {apply} from "./cabbages.ts"
import test from "node:test"
import assert from "node:assert"

test.test("patch", async t => {
	await t.test("mutates", t => {
		let path = ["deeply", "nested"]
		let obj = {deeply: {nested: {value: 0}}}
		apply(path, obj, "value", 10)
		assert.equal(obj.deeply.nested.value, 10)
	})

	await t.test("doesnt mutate path", t => {
		let obj = {deeply: {nested: {value: 0}}}
		let path = ["deeply", "nested"]
		apply(path, obj, "value", 10)
		assert.deepEqual(path, ["deeply", "nested"])
	})

	await t.test("fills object holes", t => {
		let obj = {deeply: {}}
		let path = ["deeply", "nested"]
		apply(path, obj, "value", 10)
		// @ts-expect-error
		assert.equal(obj.deeply.nested.value, 10)
		assert.deepEqual(obj, {
			deeply: {nested: {value: 10}},
		})
	})

	await t.test("fills array path holes", t => {
		let path = ["items", 2]
		let obj = {}
		apply(path, obj, "complete", true)
		assert.deepEqual(obj, {
			// biome-ignore lint/suspicious/noSparseArray: <explanation>
			items: [, , {complete: true}],
		})
	})

	await t.test("makes a string for a ghostly splice", t => {
		let path = ["items", 0, "title"]
		let obj = {}
		apply(path, obj, [], "cool")
		assert.deepEqual(obj, {
			items: [{title: "cool"}],
		})
	})

	await t.test("replaces range in array", t => {
		let path = ["items"]
		let obj = {items: [1, 2, 3, 4, 5]}
		apply(path, obj, [1, 3], "hehe")
		assert.deepEqual(obj, {
			items: [1, "hehe", 4, 5],
		})
	})

	await t.test("replaces item in array", t => {
		let path = ["items"]
		let obj = {items: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
		apply(path, obj, 4, 1)
		assert.deepEqual(obj, {
			items: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
		})
	})

	await t.test("replaces range in string", t => {
		let path = ["text"]
		let obj = {text: "hello world"}
		apply(path, obj, [1, 4], "aww")
		assert.equal(obj.text, "hawwo world")
	})

	await t.test("inserts multiple items in array", t => {
		let path = ["items"]
		let obj = {items: ["zero"]}
		apply(path, obj, [], ["one", "two"])
		assert.deepEqual(obj.items, ["zero", "one", "two"])
	})

	await t.test("inserts multiple chars in string", t => {
		let path = ["text"]
		let obj = {text: "hello world"}
		apply(path, obj, [6, 6], "cruel ")
		assert.equal(obj.text, "hello cruel world")
	})

	await t.test("appends to array", t => {
		let path = ["items"]
		let obj = {items: ["a", "b"]}
		apply(path, obj, [], "c")
		assert.deepEqual(obj.items, ["a", "b", "c"])
	})

	await t.test("appends multiple items to array", t => {
		let path = ["items"]
		let obj = {items: ["a", "b"]}
		apply(path, obj, [], ["c", "d"])
		assert.deepEqual(obj.items, ["a", "b", "c", "d"])
	})

	await t.test("appends to string", t => {
		let path = ["text"]
		let obj = {text: "hello world"}
		apply(path, obj, [], ", what's up?")
		assert.equal(obj.text, "hello world, what's up?")
	})

	await t.test("deletes an item from an array", t => {
		let path = ["items"]
		let obj = {items: [1, 2, 3]}
		apply(path, obj, 1)
		assert.deepEqual(obj, {items: [1, 3]})
	})

	await t.test("deletes an item from an object", t => {
		let path = ["state"]
		let obj = {state: {complete: false}}
		apply(path, obj, "complete")
		assert.deepEqual(obj, {state: {}})
	})

	await t.test("deletes multiple items in an array", t => {
		let path = ["items"]
		let obj = {items: [1, 2, 3, 4, 5]}
		apply(path, obj, [2, 4])
		assert.deepEqual(obj, {items: [1, 2, 5]})
	})

	await t.test("deletes chars from a string", t => {
		let path = ["name"]
		let obj = {name: "chee rabbits"}
		apply(path, obj, [2, 5])
		assert.deepEqual(obj.name, "chrabbits")
	})

	await t.test("insert a string in an array", t => {
		let path = ["items"]
		let obj = {items: [] as string[]}
		apply(path, obj, [], "hello")
		assert.equal(obj.items[0], "hello")
	})

	await t.test("insert an array in an array", t => {
		let path = ["items"]
		let obj = {items: [] as string[]}
		apply(path, obj, [], "hello")
		assert.equal(obj.items[0], "hello")
	})

	await t.test("edit top level values", t => {
		let obj = {text: "hello"}
		apply([], obj, "text", "hallo")
		assert.equal(obj.text, "hallo")
		apply([], obj, "works", ["1", "2", "yes"])
		// @ts-expect-error
		assert.deepEqual(obj.works, ["1", "2", "yes"])
	})

	await t.test("can really fuckin go for it", t => {
		let obj = {}
		apply(
			[1, 2, 3, 4, 5, 6, "lol", "ok", "deeeeeep", 0, 1, 2, "hehe"],
			obj,
			"ok",
			"computer"
		)

		assert.equal(
			// @ts-expect-error
			obj[1][2][3][4][5][6].lol.ok.deeeeeep[0][1][2].hehe.ok,
			"computer"
		)
	})

	await t.test("deep", t => {
		let obj = {
			a: {b: {c: {d: {e: {f: {g: {h: {i: "rabbit"}}}}}}}},
		}
		apply(["a", "b", "c", "d", "e", "f", "g", "h"], obj, "i", "computer")

		assert.equal(obj.a.b.c.d.e.f.g.h.i, "computer")
	})

	await t.test("uses reviver", t => {
		let path = ["projects", "abc", "items", 2]
		let obj = {}
		apply(
			path,
			obj,
			"count",
			{
				type: "special:counter",
				value: 4,
			},
			val => {
				if (val && "type" in val && val.type == "special:counter") {
					return val.value
				}
			}
		)
		assert.deepEqual(obj, {
			// biome-ignore lint/suspicious/noSparseArray: <explanation>
			projects: {abc: {items: [, , {count: 4}]}},
		})
	})
})
