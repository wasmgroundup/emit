// WebAssembly 1.0 Module Builder
// https://wasmgroundup.com/
export function stringToBytes(s) {
  const bytes = new TextEncoder().encode(s);
  return Array.from(bytes);
}

export function magic() {
  // [0x00, 0x61, 0x73, 0x6d]
  return stringToBytes('\0asm');
}

export function version() {
  return [0x01, 0x00, 0x00, 0x00];
}

export const SEVEN_BIT_MASK_BIG_INT = 0b01111111n;
export const CONTINUATION_BIT = 0b10000000;

export function u32(v) {
  assert(v >= 0, `Value is negative: ${v}`);

  let val = BigInt(v);
  let more = true;
  const r = [];

  while (more) {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);
    val = val >> 7n;
    more = val !== 0n;
    if (more) {
      r.push(b | CONTINUATION_BIT);
    } else {
      r.push(b);
    }
  }

  return r;
}

export function i32(v) {
  let val = BigInt(v);
  const r = [];

  let more = true;
  while (more) {
    const b = Number(val & 0b01111111n);
    const signBitSet = !!(b & 0x40);

    val = val >> 7n;

    if ((val === 0n && !signBitSet) || (val === -1n && signBitSet)) {
      more = false;
      r.push(b);
    } else {
      r.push(b | CONTINUATION_BIT);
    }
  }

  return r;
}

export function section(id, contents) {
  const sizeInBytes = contents.flat(Infinity).length;
  return [id, u32(sizeInBytes), contents];
}

export function vec(elements) {
  return [u32(elements.length), elements];
}

export const SECTION_ID_TYPE = 1;

export function functype(paramTypes, resultTypes) {
  return [0x60, vec(paramTypes), vec(resultTypes)];
}

export function typesec(functypes) {
  return section(SECTION_ID_TYPE, vec(functypes));
}

export const SECTION_ID_FUNCTION = 3;

export const typeidx = (x) => u32(x);

export function funcsec(typeidxs) {
  return section(SECTION_ID_FUNCTION, vec(typeidxs));
}

export const SECTION_ID_CODE = 10;

export function code(func) {
  const sizeInBytes = func.flat(Infinity).length;
  return [u32(sizeInBytes), func];
}

export function func(locals, body) {
  return [vec(locals), body];
}

export function codesec(codes) {
  return section(SECTION_ID_CODE, vec(codes));
}

export const instr = {
  end: 0x0b,
};

export const SECTION_ID_EXPORT = 7;

export function name(s) {
  return vec(stringToBytes(s));
}

export function export_(nm, exportdesc) {
  return [name(nm), exportdesc];
}

export function exportsec(exports) {
  return section(SECTION_ID_EXPORT, vec(exports));
}

export const funcidx = (x) => u32(x);

export const exportdesc = {
  func(idx) {
    return [0x00, funcidx(idx)];
  },
};

export function module(sections) {
  return [magic(), version(), sections];
}
export const valtype = {
  i32: 0x7f,
  i64: 0x7e,
  f32: 0x7d,
  f64: 0x7c,
};

instr.i32 = {const: 0x41};
instr.i64 = {const: 0x42};
instr.f32 = {const: 0x43};
instr.f64 = {const: 0x44};
instr.i32.add = 0x6a;
instr.i32.sub = 0x6b;
instr.i32.mul = 0x6c;
instr.i32.div_s = 0x6d;
instr.local = {};
instr.local.get = 0x20;
instr.local.set = 0x21;
instr.local.tee = 0x22;

export function locals(n, type) {
  return [u32(n), type];
}

export const localidx = u32;

instr.drop = 0x1a;
instr.call = 0x10;
instr.if = 0x04;
instr.else = 0x05;

export const blocktype = {empty: 0x40, ...valtype};

instr.i32.eq = 0x46; // a == b
instr.i32.ne = 0x47; // a != b
instr.i32.lt_s = 0x48; // a < b (signed)
instr.i32.lt_u = 0x49; // a < b (unsigned)
instr.i32.gt_s = 0x4a; // a > b (signed)
instr.i32.gt_u = 0x4b; // a > b (unsigned)
instr.i32.le_s = 0x4c; // a <= b (signed)
instr.i32.le_u = 0x4d; // a <= b (unsigned)
instr.i32.ge_s = 0x4e; // a >= b (signed)
instr.i32.ge_u = 0x4f; // a >= b (unsigned)

instr.i32.eqz = 0x45; // a == 0

instr.i32.and = 0x71;
instr.i32.or = 0x72;

export const labelidx = u32;

instr.block = 0x02;
instr.loop = 0x03;
instr.br = 0x0c;
instr.br_if = 0x0d;
export const SECTION_ID_IMPORT = 2;

// mod:name  nm:name  d:importdesc
export function import_(mod, nm, d) {
  return [name(mod), name(nm), d];
}

// im*:vec(import)
export function importsec(ims) {
  return section(SECTION_ID_IMPORT, vec(ims));
}

export const importdesc = {
  // x:typeidx
  func(x) {
    return [0x00, typeidx(x)];
  },
};
export const SECTION_ID_MEMORY = 5;

export function memsec(mems) {
  return section(SECTION_ID_MEMORY, vec(mems));
}

export function mem(memtype) {
  return memtype;
}

export function memtype(limits) {
  return limits;
}

export const limits = {
  // n:u32
  min(n) {
    return [0x00, u32(n)];
  },
  // n:u32, m:u32
  minmax(n, m) {
    return [0x01, u32(n), u32(m)];
  },
};

export const memidx = u32;

exportdesc.mem = (idx) => [0x02, memidx(idx)];

instr.memory = {
  size: 0x3f, // [] -> [i32]
  grow: 0x40, // [i32] -> [i32]
};

instr.i32.load = 0x28; // [i32] -> [i32]
instr.i32.store = 0x36; // [i32, i32] -> []

// align:u32, offset:u32
export function memarg(align, offset) {
  return [u32(align), u32(offset)];
}
export function int32ToBytes(v) {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];
}

instr.i32.unreachable = 0x00;

export const SECTION_ID_DATA = 11;

// x:memidx  e:expr  bs:vec(byte)
export function data(x, e, bs) {
  return [x, e, vec(bs)];
}

export function datasec(segs) {
  return section(SECTION_ID_DATA, vec(segs));
}
export const SECTION_ID_START = 8;

export const start = funcidx;

// st:start
export function startsec(st) {
  return section(SECTION_ID_START, st);
}

instr.global = {};
instr.global.get = 0x23;
instr.global.set = 0x24;

export const globalidx = u32;

exportdesc.global = (idx) => [0x03, globalidx(idx)];

export const SECTION_ID_GLOBAL = 6;

export const mut = {
  const: 0x00,
  var: 0x01,
};

// t:valtype  m:mut
export function globaltype(t, m) {
  return [t, m];
}

// gt:globaltype  e:expr
export function global(gt, e) {
  return [gt, e];
}

// glob*:vec(global)
export function globalsec(globs) {
  return section(SECTION_ID_GLOBAL, vec(globs));
}

export const SECTION_ID_TABLE = 4;

export function tabletype(elemtype, limits) {
  return [elemtype, limits];
}

export function table(tabletype) {
  return tabletype;
}

export function tablesec(tables) {
  return section(SECTION_ID_TABLE, vec(tables));
}

export const elemtype = {funcref: 0x70};

export const tableidx = u32;

exportdesc.table = (idx) => [0x01, tableidx(idx)];

instr.call_indirect = 0x11;

export const SECTION_ID_ELEMENT = 9;

// x:tableidx  e:expr  y∗:vec(funcidx)
export function elem(x, e, ys) {
  return [x, e, vec(ys)];
}

export function elemsec(segs) {
  return section(SECTION_ID_ELEMENT, vec(segs));
}
export function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}
