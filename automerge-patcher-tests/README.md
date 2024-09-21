# cabbages/automerge-patcher-tests

These tests come from the fantastic
[automerge-patcher](https://github.com/onsetsoftware/automerge-patcher) module,
which is specifically for applying automerge patches to objects. cabbages is
focused on being a general patcher for braid-style ranges, with a function that
converts automerge patches to braid-style ranges.

What better way to test the conversion than with an already-thoroughly-tested
lib. I've dropped the `unpatch` tests because that's none of my business.
