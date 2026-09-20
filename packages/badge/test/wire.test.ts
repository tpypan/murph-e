import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isBadgePort } from '../src/wire.ts'

test('only Espressif ports with a MAC serial are badges', () => {
  assert.ok(isBadgePort({ vendorId: '303a', productId: '1001', serialNumber: '68:EE:8F:01:23:6C' }))
  assert.ok(isBadgePort({ vendorId: '303A', productId: '1001', serialNumber: '28:84:85:ec:b1:24' }))
})

test('the arcade board shares the IDs but has a plain hex serial, so it is skipped', () => {
  assert.equal(
    isBadgePort({ vendorId: '303a', productId: '1001', serialNumber: 'E072A1E9FEF42' }),
    false,
  )
  assert.equal(isBadgePort({ vendorId: '303a', productId: '1001' }), false)
  assert.equal(
    isBadgePort({ vendorId: '1a86', productId: '7523', serialNumber: '68:EE:8F:01:23:6C' }),
    false,
  )
})
