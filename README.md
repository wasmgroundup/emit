# emit

_(From the book [WebAssembly from the Ground Up](https://wasmgroundup.com) — learn Wasm by building a simple compiler in JavaScript.)_

A JavaScript library to emit WebAssembly 1.0 binary modules.

## Installation

```sh
npm i @wasmgroundup/emit
```

## Examples

Build a WebAssembly module with an exported `add` function:

```typescript
import * as w from "@wasmgroundup/emit";

const mod = w.module([
  w.typesec([w.functype([w.valtype.i32, w.valtype.i32], [w.valtype.i32])]),
  w.funcsec([w.typeidx(0)]),
  w.exportsec([w.export_("add", w.exportdesc.func(w.funcidx(0)))]),
  w.codesec([
    w.code(
      w.func(
        [],
        w.expr([
          [w.instr.local.get, w.i32(0)],
          [w.instr.local.get, w.i32(1)],
          w.instr.i32.add,
        ]),
      ),
    ),
  ]),
]);

const { instance } = await WebAssembly.instantiate(w.flatten(mod));
const { add } = instance.exports as { add: (a: number, b: number) => number };
console.log(add(1, 2)); // 3
```

### Multiple types

Declare multiple function types (e.g., for an `add` function and a `log` callback):

```typescript
w.typesec([
  w.functype([w.valtype.i32, w.valtype.i32], [w.valtype.i32]), // type 0: (i32, i32) -> i32
  w.functype([w.valtype.i32], []),                              // type 1: (i32) -> void
])
```

### Imports

Import a function from the host environment (goes after `typesec` in the module):

```typescript
w.importsec([
  w.import_("env", "log", w.importdesc.func(w.typeidx(1))),
])
```

### Globals

Define a mutable global initialized to 0 (goes after `funcsec` in the module):

```typescript
w.globalsec([
  w.global(
    w.globaltype(w.valtype.i32, w.mut.var),
    w.expr([[w.instr.i32.const, w.i32(0)]]),
  ),
])
```

## Features

- Simple API following the [spec](https://www.w3.org/TR/2019/REC-wasm-core-1-20191205/)'s naming conventions
- Full support for WebAssembly 1.0 specification
- Generate binary WASM modules directly from JavaScript
- Zero dependencies

## License

MIT (see LICENSE file)
