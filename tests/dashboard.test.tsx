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

test('le bandeau affiche la barre 5 h et se masque', async ($, on) => {
  mock.clock(on)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => { const { Text } = $.ui.resolve(e); return <Text key="engine">prompt</Text> })
  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'cerveau-dashboard', surface, component: 'AbovePrompt', props: {} } as any)
    expect(await ui.find({ key: 'open' })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ plugin: 'cerveau-dashboard', surface: 'mobile', component: 'AbovePrompt', props: {} } as any)
  await ui.press({ key: 'hide' })
  expect(await ui.find({ key: 'open' })).toBeUndefined()
  await ui.unmount()
})
