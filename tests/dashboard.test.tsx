import { expect, mock, test } from 'claude-code/testing'

test('le dashboard se replie et se déplie sur chaque surface', async ($, on) => {
  mock.clock(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'cerveau-dashboard',
      surface,
      component: 'Pane',
      requestId: 'cerveau',
      props: { placement: 'dock' },
    } as any)
    expect(await ui.find({ type: 'Text', text: /fenêtre 5 h/ })).toBeDefined()
    await ui.press({ key: 'toggle' })
    expect(await ui.find({ type: 'Text', text: /^5 h :/ })).toBeDefined()
    await ui.press({ key: 'toggle' })
    expect(await ui.find({ type: 'Text', text: /Second cerveau/ })).toBeDefined()
    await ui.unmount()
  }
})
