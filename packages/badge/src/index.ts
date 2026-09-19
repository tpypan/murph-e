export { FAKE_PRESETS, FakeBadge, type FakeBadgeOptions, FakeTransport } from './fake.ts'
export { BadgeHub, type BadgeInfo, type HubEvent, type HubOptions } from './hub.ts'
export { BadgeLink } from './link.ts'
export {
  APP_SLUG,
  APP_VERSION,
  BUTTONS,
  type Button,
  buttonName,
  DEFAULT_BUTTON_MAP,
  type Identity,
  identityFromUitree,
  manifestVersion,
  parseLine,
  parseMap,
} from './protocol.ts'
export { type PortInfo, SerialTransport, type Transport, type Wire } from './wire.ts'
