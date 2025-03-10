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

export const CONTINUATION_BIT = 0b10000000;
export const SEVEN_BIT_MASK_BIG_INT = 0b01111111n;

export function leb128(v) {
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

export const MIN_U32 = 0;
export const MAX_U32 = 2 ** 32 - 1;

export function u32(v) {
  if (v < MIN_U32 || v > MAX_U32) {
    throw Error(`Value out of range for u32: ${v}`);
  }

  return leb128(v);
}

export function sleb128(v) {
  let val = BigInt(v);
  let more = true;
  const r = [];

  while (more) {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);
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

export const MIN_I32 = -(2 ** 32 / 2);
export const MAX_I32 = 2 ** 32 / 2 - 1;
export const I32_NEG_OFFSET = 2 ** 32;

export function i32(v) {
  if (v < MIN_I32 || v > MAX_U32) {
    throw Error(`Value out of range for i32: ${v}`);
  }

  if (v > MAX_I32) {
    return sleb128(v - I32_NEG_OFFSET);
  }

  return sleb128(v);
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

export const localidx = (x) => u32(x);

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

instr.unreachable = 0x00;

export const SECTION_ID_DATA = 11;

// x:memidx  e:expr  bs:vec(byte)
export function data(x, e, bs) {
  return [x, e, vec(bs)];
}

export function datasec(segs) {
  return section(SECTION_ID_DATA, vec(segs));
}
export const SECTION_ID_CUSTOM = 0;

export function custom(name, bytes) {
  return [name, bytes];
}

export function customsec(custom) {
  return section(SECTION_ID_CUSTOM, custom);
}

export function namesec(namedata) {
  return customsec(custom(name('name'), namedata));
}

// n:name
export function namedata(modulenamesubsec, funcnamesubsec, localnamesubsec) {
  return [modulenamesubsec, funcnamesubsec, localnamesubsec];
}

export const CUSTOM_NAME_SUB_SEC_MODULE = 0;
export function modulenamesubsec(n) {
  return namesubsection(CUSTOM_NAME_SUB_SEC_MODULE, name(n));
}

export const CUSTOM_NAME_SUB_SEC_FUNC = 1;
export function funcnamesubsec(namemap) {
  return namesubsection(CUSTOM_NAME_SUB_SEC_FUNC, namemap);
}

// N:byte
export function namesubsection(N, B) {
  const flatB = B.flat(Infinity);
  const size = u32(flatB.length);
  return [N, size, flatB];
}

export function namemap(nameassocs) {
  return vec(nameassocs);
}

export function nameassoc(idx, n) {
  return [idx, name(n)];
}

export const CUSTOM_NAME_SUB_SEC_LOCAL = 2;
export function localnamesubsec(indirectnamemap) {
  return namesubsection(CUSTOM_NAME_SUB_SEC_LOCAL, indirectnamemap);
}

export function indirectnamemap(indirectnameassocs) {
  return vec(indirectnameassocs);
}

export function indirectnameassoc(idx, namemap) {
  return [idx, namemap];
}
export const SECTION_ID_START = 8;

export const start = (x) => funcidx(x);

// st:start
export function startsec(st) {
  return section(SECTION_ID_START, st);
}

instr.global = {};
instr.global.get = 0x23;
instr.global.set = 0x24;

export const globalidx = (x) => u32(x);

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

export const elemtype = {funcref: 0x70};

// et:elemtype  lim:limits
export function tabletype(et, lim) {
  return [et, lim];
}

// tt:tabletype
export function table(tt) {
  return tt;
}

export function tablesec(tables) {
  return section(SECTION_ID_TABLE, vec(tables));
}

export const tableidx = (x) => u32(x);

instr.call_indirect = 0x11; // [i32] -> []

export const SECTION_ID_ELEMENT = 9;

// x:tableidx  e:expr  y∗:vec(funcidx)
export function elem(x, e, ys) {
  return [x, e, vec(ys)];
}

export function elemsec(segs) {
  return section(SECTION_ID_ELEMENT, vec(segs));
}

instr.local ??= {};
instr.global ??= {};
instr.memory ??= {};
instr.i32 ??= {};
instr.i64 ??= {};
instr.f32 ??= {};
instr.f64 ??= {};
instr.unreachable = 0x0;
instr.nop = 0x1;
instr.block = 0x2;
instr.loop = 0x3;
instr.if = 0x4;
instr.else = 0x5;
instr.end = 0xb;
instr.br = 0xc;
instr.br_if = 0xd;
instr.br_table = 0xe;
instr.return = 0xf;
instr.call = 0x10;
instr.call_indirect = 0x11;
instr.drop = 0x1a;
instr.select = 0x1b;
instr.local.get = 0x20;
instr.local.set = 0x21;
instr.local.tee = 0x22;
instr.global.get = 0x23;
instr.global.set = 0x24;
instr.i32.load = 0x28;
instr.i64.load = 0x29;
instr.f32.load = 0x2a;
instr.f64.load = 0x2b;
instr.i32.load8_s = 0x2c;
instr.i32.load8_u = 0x2d;
instr.i32.load16_s = 0x2e;
instr.i32.load16_u = 0x2f;
instr.i64.load8_s = 0x30;
instr.i64.load8_u = 0x31;
instr.i64.load16_s = 0x32;
instr.i64.load16_u = 0x33;
instr.i64.load32_s = 0x34;
instr.i64.load32_u = 0x35;
instr.i32.store = 0x36;
instr.i64.store = 0x37;
instr.f32.store = 0x38;
instr.f64.store = 0x39;
instr.i32.store8 = 0x3a;
instr.i32.store16 = 0x3b;
instr.i64.store8 = 0x3c;
instr.i64.store16 = 0x3d;
instr.i64.store32 = 0x3e;
instr.memory.size = 0x3f;
instr.memory.grow = 0x40;
instr.i32.const = 0x41;
instr.i64.const = 0x42;
instr.f32.const = 0x43;
instr.f64.const = 0x44;
instr.i32.eqz = 0x45;
instr.i32.eq = 0x46;
instr.i32.ne = 0x47;
instr.i32.lt_s = 0x48;
instr.i32.lt_u = 0x49;
instr.i32.gt_s = 0x4a;
instr.i32.gt_u = 0x4b;
instr.i32.le_s = 0x4c;
instr.i32.le_u = 0x4d;
instr.i32.ge_s = 0x4e;
instr.i32.ge_u = 0x4f;
instr.i64.eqz = 0x50;
instr.i64.eq = 0x51;
instr.i64.ne = 0x52;
instr.i64.lt_s = 0x53;
instr.i64.lt_u = 0x54;
instr.i64.gt_s = 0x55;
instr.i64.gt_u = 0x56;
instr.i64.le_s = 0x57;
instr.i64.le_u = 0x58;
instr.i64.ge_s = 0x59;
instr.i64.ge_u = 0x5a;
instr.f32.eq = 0x5b;
instr.f32.ne = 0x5c;
instr.f32.lt = 0x5d;
instr.f32.gt = 0x5e;
instr.f32.le = 0x5f;
instr.f32.ge = 0x60;
instr.f64.eq = 0x61;
instr.f64.ne = 0x62;
instr.f64.lt = 0x63;
instr.f64.gt = 0x64;
instr.f64.le = 0x65;
instr.f64.ge = 0x66;
instr.i32.clz = 0x67;
instr.i32.ctz = 0x68;
instr.i32.popcnt = 0x69;
instr.i32.add = 0x6a;
instr.i32.sub = 0x6b;
instr.i32.mul = 0x6c;
instr.i32.div_s = 0x6d;
instr.i32.div_u = 0x6e;
instr.i32.rem_s = 0x6f;
instr.i32.rem_u = 0x70;
instr.i32.and = 0x71;
instr.i32.or = 0x72;
instr.i32.xor = 0x73;
instr.i32.shl = 0x74;
instr.i32.shr_s = 0x75;
instr.i32.shr_u = 0x76;
instr.i32.rotl = 0x77;
instr.i32.rotr = 0x78;
instr.i64.clz = 0x79;
instr.i64.ctz = 0x7a;
instr.i64.popcnt = 0x7b;
instr.i64.add = 0x7c;
instr.i64.sub = 0x7d;
instr.i64.mul = 0x7e;
instr.i64.div_s = 0x7f;
instr.i64.div_u = 0x80;
instr.i64.rem_s = 0x81;
instr.i64.rem_u = 0x82;
instr.i64.and = 0x83;
instr.i64.or = 0x84;
instr.i64.xor = 0x85;
instr.i64.shl = 0x86;
instr.i64.shr_s = 0x87;
instr.i64.shr_u = 0x88;
instr.i64.rotl = 0x89;
instr.i64.rotr = 0x8a;
instr.f32.abs = 0x8b;
instr.f32.neg = 0x8c;
instr.f32.ceil = 0x8d;
instr.f32.floor = 0x8e;
instr.f32.trunc = 0x8f;
instr.f32.nearest = 0x90;
instr.f32.sqrt = 0x91;
instr.f32.add = 0x92;
instr.f32.sub = 0x93;
instr.f32.mul = 0x94;
instr.f32.div = 0x95;
instr.f32.min = 0x96;
instr.f32.max = 0x97;
instr.f32.copysign = 0x98;
instr.f64.abs = 0x99;
instr.f64.neg = 0x9a;
instr.f64.ceil = 0x9b;
instr.f64.floor = 0x9c;
instr.f64.trunc = 0x9d;
instr.f64.nearest = 0x9e;
instr.f64.sqrt = 0x9f;
instr.f64.add = 0xa0;
instr.f64.sub = 0xa1;
instr.f64.mul = 0xa2;
instr.f64.div = 0xa3;
instr.f64.min = 0xa4;
instr.f64.max = 0xa5;
instr.f64.copysign = 0xa6;
instr.i32.wrap_i64 = 0xa7;
instr.i32.trunc_f32_s = 0xa8;
instr.i32.trunc_f32_u = 0xa9;
instr.i32.trunc_f64_s = 0xaa;
instr.i32.trunc_f64_u = 0xab;
instr.i64.extend_i32_s = 0xac;
instr.i64.extend_i32_u = 0xad;
instr.i64.trunc_f32_s = 0xae;
instr.i64.trunc_f32_u = 0xaf;
instr.i64.trunc_f64_s = 0xb0;
instr.i64.trunc_f64_u = 0xb1;
instr.f32.convert_i32_s = 0xb2;
instr.f32.convert_i32_u = 0xb3;
instr.f32.convert_i64_s = 0xb4;
instr.f32.convert_i64_u = 0xb5;
instr.f32.demote_f64 = 0xb6;
instr.f64.convert_i32_s = 0xb7;
instr.f64.convert_i32_u = 0xb8;
instr.f64.convert_i64_s = 0xb9;
instr.f64.convert_i64_u = 0xba;
instr.f64.promote_f32 = 0xbb;
instr.i32.reinterpret_f32 = 0xbc;
instr.i64.reinterpret_f64 = 0xbd;
instr.f32.reinterpret_i32 = 0xbe;
instr.f64.reinterpret_i64 = 0xbf;
