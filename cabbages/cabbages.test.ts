import {apply} from "./cabbages.ts"
import test from "node:test"
import assert from "node:assert"

test.test("patch", async t => {
	await t.test("mutates", t => {
		let path = ["deeply", "nested"]
		let obj = {deeply: {nested: {value: 0}}}
		apply(obj, path, "value", 10)
		assert.equal(obj.deeply.nested.value, 10)
	})

	await t.test("doesnt mutate path", t => {
		let obj = {deeply: {nested: {value: 0}}}
		let path = ["deeply", "nested"]
		apply(obj, path, "value", 10)
		assert.deepEqual(path, ["deeply", "nested"])
	})

	await t.test("fills object holes", t => {
		let obj = {deeply: {}}
		let path = ["deeply", "nested"]
		apply(obj, path, "value", 10)
		// @ts-expect-error
		assert.equal(obj.deeply.nested.value, 10)
		assert.deepEqual(obj, {
			deeply: {nested: {value: 10}},
		})
	})

	await t.test("fills array path holes", t => {
		let path = ["items", 2]
		let obj = {}
		apply(obj, path, "complete", true)
		assert.deepEqual(obj, {
			// biome-ignore lint/suspicious/noSparseArray: <explanation>
			items: [, , {complete: true}],
		})
	})

	await t.test("makes a string for a ghostly splice", t => {
		let path = ["items", 0, "title"]
		let obj = {}
		apply(obj, path, [], "cool")
		assert.deepEqual(obj, {
			items: [{title: "cool"}],
		})
	})

	await t.test("replaces range in array", t => {
		let path = ["items"]
		let obj = {items: [1, 2, 3, 4, 5]}
		apply(obj, path, [1, 3], "hehe")
		assert.deepEqual(obj, {
			items: [1, "hehe", 4, 5],
		})
	})

	await t.test("replaces item in array", t => {
		let path = ["items"]
		let obj = {items: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
		apply(obj, path, 4, 1)
		assert.deepEqual(obj, {
			items: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
		})
	})

	await t.test("replaces range in string", t => {
		let path = ["text"]
		let obj = {text: "hello world"}
		apply(obj, path, [1, 4], "aww")
		assert.equal(obj.text, "hawwo world")
	})

	await t.test("inserts multiple items in array", t => {
		let path = ["items"]
		let obj = {items: ["zero"]}
		apply(obj, path, [], ["one", "two"])
		assert.deepEqual(obj.items, ["zero", "one", "two"])
	})

	await t.test("inserts multiple chars in string", t => {
		let path = ["text"]
		let obj = {text: "hello world"}
		apply(obj, path, [6, 6], "cruel ")
		assert.equal(obj.text, "hello cruel world")
	})

	await t.test("appends to array", t => {
		let path = ["items"]
		let obj = {items: ["a", "b"]}
		apply(obj, path, [], "c")
		assert.deepEqual(obj.items, ["a", "b", "c"])
	})

	await t.test("appends multiple items to array", t => {
		let path = ["items"]
		let obj = {items: ["a", "b"]}
		apply(obj, path, [], ["c", "d"])
		assert.deepEqual(obj.items, ["a", "b", "c", "d"])
	})

	await t.test("appends to string", t => {
		let path = ["text"]
		let obj = {text: "hello world"}
		apply(obj, path, [], ", what's up?")
		assert.equal(obj.text, "hello world, what's up?")
	})

	await t.test("deletes an item from an array", t => {
		let path = ["items"]
		let obj = {items: [1, 2, 3]}
		apply(obj, path, 1)
		assert.deepEqual(obj, {items: [1, 3]})
	})

	await t.test("deletes an item from an object", t => {
		let path = ["state"]
		let obj = {state: {complete: false}}
		apply(obj, path, "complete")
		assert.deepEqual(obj, {state: {}})
	})

	await t.test("deletes multiple items in an array", t => {
		let path = ["items"]
		let obj = {items: [1, 2, 3, 4, 5]}
		apply(obj, path, [2, 4])
		assert.deepEqual(obj, {items: [1, 2, 5]})
	})

	await t.test("deletes chars from a string", t => {
		let path = ["name"]
		let obj = {name: "chee rabbits"}
		apply(obj, path, [2, 5])
		assert.deepEqual(obj.name, "chrabbits")
	})

	await t.test("insert a string in an array", t => {
		let path = ["items"]
		let obj = {items: [] as string[]}
		apply(obj, path, [], "hello")
		assert.equal(obj.items[0], "hello")
	})

	await t.test("insert an array in an array", t => {
		let path = ["items"]
		let obj = {items: [] as string[]}
		apply(obj, path, [], "hello")
		assert.equal(obj.items[0], "hello")
	})

	await t.test("edit top level values", t => {
		let obj = {text: "hello"}
		apply(obj, [], "text", "hallo")
		assert.equal(obj.text, "hallo")
		apply(obj, [], "works", ["1", "2", "yes"])
		// @ts-expect-error
		assert.deepEqual(obj.works, ["1", "2", "yes"])
	})

	await t.test("can really fuckin go for it", t => {
		let obj = {}
		apply(
			obj,
			[1, 2, 3, 4, 5, 6, "lol", "ok", "deeeeeep", 0, 1, 2, "hehe"],
			"ok",
			"computer"
		)

		assert.equal(
			obj[1][2][3][4][5][6].lol.ok.deeeeeep[0][1][2].hehe.ok,
			"computer"
		)
	})

	await t.test("deep", t => {
		let obj = {
			a: {b: {c: {d: {e: {f: {g: {h: {i: "rabbit"}}}}}}}},
		}
		apply(obj, ["a", "b", "c", "d", "e", "f", "g", "h"], "i", "computer")

		assert.equal(obj.a.b.c.d.e.f.g.h.i, "computer")
	})
})
