export const PROTOCOL_VERSION = 1;
export const Command = Object.freeze({ create: 0, modify: 1, destroy: 2, setId: 3, snapshot: 4, protocolInfo: 5 });

const fields = ['highId', 'inventory', 'defIndex', 'level', 'quality', 'flags', 'origin', 'inUse', 'rarity'];
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

export function encodeDestroy(highId) {
  if (!Number.isInteger(highId) || highId < 0 || highId > 0xffffffff) throw new Error('Invalid uint32: highId.');
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Command.destroy, true);
  view.setUint32(4, highId, true);
  return buffer;
}

export function encodeCreate(template, requestId) {
  const encoder = new TextEncoder();
  const uint32 = (value, name) => {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error(`Invalid uint32: ${name}.`);
    return value;
  };
  if (!template || !Array.isArray(template.attributes) || !Array.isArray(template.equips)) throw new Error('Invalid item template.');
  const values = fields.map(field => uint32(field === 'highId' ? requestId : template[field], field));
  if (template.inUse !== 0 && template.inUse !== 1) throw new Error('inUse must be 0 or 1.');
  const attributes = template.attributes.map(attribute => {
    uint32(attribute.defIndex, 'attribute ID');
    if (typeof attribute.value !== 'string') throw new Error('Attribute values must be text.');
    const bytes = encoder.encode(attribute.value);
    uint32(bytes.byteLength, 'attribute byte length');
    return { defIndex: attribute.defIndex, bytes };
  });
  const equips = template.equips.map(equip => ({ classId: uint32(equip.classId, 'equip class'), slotId: uint32(equip.slotId, 'equip slot') }));
  uint32(attributes.length, 'attribute count');
  uint32(equips.length, 'equip count');
  const length = 4 + values.length * 4 + 8 + attributes.reduce((size, a) => size + 8 + a.bytes.byteLength, 0) + equips.length * 8;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  let offset = 0;
  const write = value => { view.setUint32(offset, value, true); offset += 4; };
  write(Command.create);
  values.forEach(write);
  write(attributes.length);
  for (const attribute of attributes) {
    write(attribute.defIndex);
    write(attribute.bytes.byteLength);
    new Uint8Array(buffer, offset, attribute.bytes.byteLength).set(attribute.bytes);
    offset += attribute.bytes.byteLength;
  }
  write(equips.length);
  for (const equip of equips) { write(equip.classId); write(equip.slotId); }
  return buffer;
}

// A WebSocket message is the envelope. Decode it completely before changing state.
export function decodeMessage(buffer) {
  if (!(buffer instanceof ArrayBuffer)) throw new Error('Expected a binary WebSocket message.');
  const view = new DataView(buffer);
  let offset = 0;
  const remaining = () => view.byteLength - offset;
  const requireBytes = size => {
    if (size > remaining()) throw new Error('Truncated inventory message.');
  };
  const uint32 = () => {
    requireBytes(4);
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };
  const count = minimumSize => {
    const value = uint32();
    if (value > Math.floor(remaining() / minimumSize)) throw new Error('Invalid inventory count.');
    return value;
  };
  const item = () => {
    const result = {};
    for (const field of fields) result[field] = uint32();
    result.attributes = [];
    const attributeCount = count(8);
    for (let i = 0; i < attributeCount; i++) {
      const defIndex = uint32();
      const length = uint32();
      requireBytes(length);
      const value = decoder.decode(new Uint8Array(buffer, offset, length));
      offset += length;
      result.attributes.push({ defIndex, value });
    }
    result.equips = [];
    const equipCount = count(8);
    for (let i = 0; i < equipCount; i++) result.equips.push({ classId: uint32(), slotId: uint32() });
    return result;
  };

  const commands = [];
  let snapshot = false;
  while (remaining()) {
    const type = uint32();
    if (type === Command.snapshot) {
      if (commands.length) throw new Error('Snapshot marker must start its message.');
      snapshot = true;
      commands.push({ type });
    } else if (type === Command.create || type === Command.modify) {
      if (snapshot && type !== Command.create) throw new Error('Snapshot may only contain created items.');
      commands.push({ type, item: item() });
    } else if (type === Command.destroy && !snapshot) {
      commands.push({ type, highId: uint32() });
    } else if (type === Command.setId && !snapshot) {
      commands.push({ type, requestId: uint32(), highId: uint32() });
    } else if (type === Command.protocolInfo && !commands.length) {
      commands.push({ type, version: uint32() });
      if (remaining()) throw new Error('Protocol information must be a separate message.');
    } else {
      throw new Error(`Unexpected inventory command ${type}.`);
    }
  }
  return commands;
}
