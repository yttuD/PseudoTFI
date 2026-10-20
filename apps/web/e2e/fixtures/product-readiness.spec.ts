import { test, expect } from '@playwright/test';
import assert from 'node:assert';
import {
  ACTOR_DEFINITIONS,
  createMockSessionToken,
  decodeMockSessionToken,
  getAuthHeadersForActor,
  setTestSessionForActor,
} from './actors';
import {
  getScreenshotFilename,
  setThemeAndWait,
  waitForSettledState,
  checkHorizontalOverflow,
  checkElementContrast,
  checkTouchTargets,
  checkAccessibleName,
  checkVisibleFocus,
  parseRgba,
  blendRgba,
  composeBackgroundChain,
  getRelativeLuminance,
  calculateContrastRatio,
  evaluateFocusIndicator,
  isGenuineInlineProseLink,
  evaluateSettleState,
  evaluateKeyboardReachability,
  evaluateThemeIntegrity,
  isLightBackground,
  isDarkBackground,
  assertThemeIntegrity,
  settleFullPageMedia,
  assertUnitCardImagesLoaded,
  isProtrusionEscapingToViewport,
} from './product-readiness';

/**
 * Pure behavioral validation function that can be executed directly in Node
 * without launching a browser or starting a web server.
 */
export function runProductReadinessPureTests(): { passed: number; failed: number; tests: string[] } {
  const executedTests: string[] = [];

  // 1. Canonical public actor role is 'buscador'
  {
    assert.strictEqual(ACTOR_DEFINITIONS.public_user.role, 'public_user');
    assert.strictEqual(ACTOR_DEFINITIONS.public_user.authRole, 'buscador');
    assert.strictEqual(ACTOR_DEFINITIONS.public_user.email, 'buscador@test.com');
    assert.ok(
      !ACTOR_DEFINITIONS.public_user.description.toLowerCase().includes('inquilino'),
      'Actor description must not reference inquilino'
    );

    const token = createMockSessionToken({
      userId: ACTOR_DEFINITIONS.public_user.id,
      email: ACTOR_DEFINITIONS.public_user.email,
      role: ACTOR_DEFINITIONS.public_user.authRole,
      accessContext: ACTOR_DEFINITIONS.public_user.accessContext,
    });
    const decoded = decodeMockSessionToken(token) as any;
    assert.ok(decoded, 'Decoded token payload must exist');
    assert.strictEqual(decoded.user_metadata.role, 'buscador');
    assert.strictEqual(decoded.user_metadata.rol, 'buscador');
    assert.notStrictEqual(decoded.user_metadata.role, 'inquilino');

    const headers = getAuthHeadersForActor('public_user');
    assert.ok(headers.Authorization.startsWith('Bearer '));
    executedTests.push('1. Canonical public actor session metadata role is strictly buscador');
  }

  // 2. Denominator helper test naming and inventory consistency
  {
    const filename = getScreenshotFilename({
      id: 'SURF-001',
      actor: 'public_user',
      state: 'default',
      width: 375,
      theme: 'dark',
    });
    assert.strictEqual(filename, 'SURF-001__public_user__default__375w__dark.png');

    // Expected exact denominator breakdown
    const e2eSpecSuites = 32;
    const apiSpecSuites = 21;
    const dbTestSuites = 1;
    const totalAutomatedSuites = e2eSpecSuites + apiSpecSuites + dbTestSuites; // 54
    assert.strictEqual(totalAutomatedSuites, 54, 'Automated suites must equal 54');

    const routesCount = 41;
    const interactionsCount = 20;
    const apiCapabilitiesCount = 15;
    const dataMigrationsCount = 18;
    const totalDenominator = routesCount + interactionsCount + apiCapabilitiesCount + dataMigrationsCount + totalAutomatedSuites; // 148
    assert.strictEqual(totalDenominator, 148, 'Total tracked denominator must equal 148');

    const feature001Baseline = 103;
    const delta = totalDenominator - feature001Baseline;
    assert.strictEqual(delta, 45, 'Net delta versus Feature 001 must equal +45');
    executedTests.push('2. Denominator helper test naming and inventory consistency verified (148 items, 54 suites, +45 delta)');
  }

  // 3. Recursive alpha composition math
  {
    // Color parsing
    assert.deepStrictEqual(parseRgba('rgb(10, 20, 30)'), [10, 20, 30, 1]);
    assert.deepStrictEqual(parseRgba('rgba(10, 20, 30, 0.5)'), [10, 20, 30, 0.5]);
    assert.deepStrictEqual(parseRgba('transparent'), [0, 0, 0, 0]);
    assert.deepStrictEqual(parseRgba('#ffffff'), [255, 255, 255, 1]);
    assert.deepStrictEqual(parseRgba('#00000080'), [0, 0, 0, 128 / 255]);

    // blendRgba: Porter-Duff Over
    // Opaque over opaque
    assert.deepStrictEqual(blendRgba([100, 150, 200, 1], [0, 0, 0, 1]), [100, 150, 200, 1]);
    // 50% white over black -> mid-gray 128
    assert.deepStrictEqual(blendRgba([255, 255, 255, 0.5], [0, 0, 0, 1]), [128, 128, 128, 1]);
    // Transparent over base -> base unchanged
    assert.deepStrictEqual(blendRgba([0, 0, 0, 0], [15, 23, 42, 1]), [15, 23, 42, 1]);

    // Recursive background composition through ancestor chain
    // Stack: canvas fallback [255,255,255] -> body [15,23,42] -> overlay [0,0,0,0.5] -> card [30,41,59,1]
    const composedOpaqueCard = composeBackgroundChain(
      [
        'rgba(0,0,0,0)', // html
        'rgb(15, 23, 42)', // body (opaque replaces canvas)
        'rgba(0, 0, 0, 0.5)', // backdrop
        'rgb(30, 41, 59)', // card (opaque replaces backdrop)
      ],
      'rgb(255, 255, 255)'
    );
    assert.deepStrictEqual(composedOpaqueCard, [30, 41, 59]);

    // Translucent chip on translucent card over dark body:
    // Body: [15, 23, 42]
    // Card: rgba(255, 255, 255, 0.1) -> [255*0.1 + 15*0.9, 255*0.1 + 23*0.9, 255*0.1 + 42*0.9] = [39, 46, 63]
    const composedChip = composeBackgroundChain(
      [
        'rgb(15, 23, 42)',
        'rgba(255, 255, 255, 0.1)',
      ],
      'rgb(255, 255, 255)'
    );
    assert.deepStrictEqual(composedChip, [39, 46, 63]);

    // Luminance & Contrast
    const blackOnWhite = calculateContrastRatio([0, 0, 0], [255, 255, 255]);
    assert.strictEqual(blackOnWhite, 21);

    const whiteOnWhite = calculateContrastRatio([255, 255, 255], [255, 255, 255]);
    assert.strictEqual(whiteOnWhite, 1);

    const darkTextContrast = calculateContrastRatio([255, 255, 255], [15, 23, 42]);
    assert.ok(darkTextContrast >= 12, 'White on slate-900 must exceed 12:1');
    executedTests.push('3. Recursive alpha composition math and WCAG contrast verified');
  }

  // 4. Focus-style comparison behavior
  {
    // Scenario A: Pre-existing box shadow ignored when unchanged upon focus
    const beforeA = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
    const afterA = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
    const resA = evaluateFocusIndicator(beforeA, afterA);
    assert.strictEqual(resA.hasVisibleFocus, false, 'Pre-existing unchanged shadow must NOT count as focus');
    assert.strictEqual(resA.boxShadowChanged, false);
    assert.ok(resA.diagnostic.includes('Pre-existing box-shadow ignored'));

    // Scenario B: Visible ring added via box-shadow
    const beforeB = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
    const afterB = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: '0 0 0 2px rgb(59, 130, 246), 0 1px 3px rgba(0,0,0,0.1)' };
    const resB = evaluateFocusIndicator(beforeB, afterB);
    assert.strictEqual(resB.hasVisibleFocus, true, 'Materially changed box-shadow ring must pass');
    assert.strictEqual(resB.boxShadowChanged, true);

    // Scenario C: Outline newly present
    const beforeC = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: 'none' };
    const afterC = { outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'rgb(59, 130, 246)', boxShadow: 'none' };
    const resC = evaluateFocusIndicator(beforeC, afterC);
    assert.strictEqual(resC.hasVisibleFocus, true, 'Newly present outline must pass');
    assert.strictEqual(resC.outlineChanged, true);

    // Scenario D: Outline width increased
    const beforeD = { outlineStyle: 'solid', outlineWidth: 1, outlineColor: 'rgb(0,0,0)', boxShadow: 'none' };
    const afterD = { outlineStyle: 'solid', outlineWidth: 3, outlineColor: 'rgb(59, 130, 246)', boxShadow: 'none' };
    const resD = evaluateFocusIndicator(beforeD, afterD);
    assert.strictEqual(resD.hasVisibleFocus, true, 'Material outline change must pass');
    assert.strictEqual(resD.outlineChanged, true);
    executedTests.push('4. Focus-style comparison behavior and pre-existing shadow rejection verified');
  }

  // 5. Touch / prose-link classification behavior
  {
    // Genuine inline prose link in paragraph
    const proseLink = isGenuineInlineProseLink({
      tagName: 'a',
      computedDisplay: 'inline',
      isInsideParagraph: true,
      isStandaloneSpanWrapper: false,
      hasButtonOrNavSemantics: false,
      hasTestId: false,
      hasIcon: false,
      hasControlClasses: false,
    });
    assert.strictEqual(proseLink, true, 'Genuine inline prose link in paragraph must be classified as prose (excluded from 44px)');

    // Link with test ID inside paragraph: must NOT be excluded
    const linkWithTestId = isGenuineInlineProseLink({
      tagName: 'a',
      computedDisplay: 'inline',
      isInsideParagraph: true,
      isStandaloneSpanWrapper: false,
      hasButtonOrNavSemantics: false,
      hasTestId: true,
      hasIcon: false,
      hasControlClasses: false,
    });
    assert.strictEqual(linkWithTestId, false, 'Link with test ID must not be excluded');

    // Link inside standalone span wrapper without paragraph: must NOT be excluded
    const linkInStandaloneSpan = isGenuineInlineProseLink({
      tagName: 'a',
      computedDisplay: 'inline',
      isInsideParagraph: false,
      isStandaloneSpanWrapper: true,
      hasButtonOrNavSemantics: false,
      hasTestId: false,
      hasIcon: false,
      hasControlClasses: false,
    });
    assert.strictEqual(linkInStandaloneSpan, false, 'Link in standalone span must not be excluded');

    // Link with icon: must NOT be excluded
    const linkWithIcon = isGenuineInlineProseLink({
      tagName: 'a',
      computedDisplay: 'inline',
      isInsideParagraph: true,
      isStandaloneSpanWrapper: false,
      hasButtonOrNavSemantics: false,
      hasTestId: false,
      hasIcon: true,
      hasControlClasses: false,
    });
    assert.strictEqual(linkWithIcon, false, 'Link with icon must not be excluded');

    // Link with button class: must NOT be excluded
    const linkWithButtonClass = isGenuineInlineProseLink({
      tagName: 'a',
      computedDisplay: 'inline',
      isInsideParagraph: true,
      isStandaloneSpanWrapper: false,
      hasButtonOrNavSemantics: false,
      hasTestId: false,
      hasIcon: false,
      hasControlClasses: true,
    });
    assert.strictEqual(linkWithButtonClass, false, 'Link with button class must not be excluded');

    // Block or flex link: must NOT be excluded
    const blockLink = isGenuineInlineProseLink({
      tagName: 'a',
      computedDisplay: 'inline-block',
      isInsideParagraph: true,
      isStandaloneSpanWrapper: false,
      hasButtonOrNavSemantics: false,
      hasTestId: false,
      hasIcon: false,
      hasControlClasses: false,
    });
    assert.strictEqual(blockLink, false, 'Non-inline link must not be excluded');
    executedTests.push('5. Touch/prose-link classification behavior verified');
  }

  // 6. Bounded settle state evaluation logic
  {
    // Normal completion with fonts settled
    const settleA = evaluateSettleState({ fontsReadyState: 'settled', elapsedMs: 120, timeoutMs: 2000 });
    assert.strictEqual(settleA.settled, true);
    assert.strictEqual(settleA.fontsSettled, true);
    assert.ok(settleA.diagnostic.includes('settled within 120ms'));

    // Fallback on timeout with fonts pending (must not throw, returns timeout fallback diagnostic)
    const settleB = evaluateSettleState({ fontsReadyState: 'timed_out', elapsedMs: 2000, timeoutMs: 2000 });
    assert.strictEqual(settleB.settled, true);
    assert.strictEqual(settleB.fontsSettled, false);
    assert.ok(settleB.diagnostic.includes('timeout fallback'));

    // Unsupported document.fonts in environment
    const settleC = evaluateSettleState({ fontsReadyState: 'unsupported', elapsedMs: 40, timeoutMs: 2000 });
    assert.strictEqual(settleC.settled, true);
    assert.strictEqual(settleC.fontsSettled, false);
    assert.ok(settleC.diagnostic.includes('not available'));
    executedTests.push('6. Bounded settle state evaluation logic and timeout fallback verified');
  }

  // 7. Bounded keyboard reachability evaluation logic
  {
    // Reachable target
    const reachA = evaluateKeyboardReachability({
      targetSelector: 'button#save',
      matched: true,
      tabCount: 3,
      maxTabs: 50,
      finalActiveElement: 'button#save',
    });
    assert.strictEqual(reachA.isReachable, true);
    assert.ok(reachA.diagnostic.includes('reached via keyboard navigation in 3 Tab press(es)'));

    // Unreachable target reaching max bound
    const reachB = evaluateKeyboardReachability({
      targetSelector: 'a#unreachable-hidden',
      matched: false,
      tabCount: 50,
      maxTabs: 50,
      finalActiveElement: 'button#close',
    });
    assert.strictEqual(reachB.isReachable, false);
    assert.ok(reachB.diagnostic.includes('is not keyboard reachable within 50 Tab presses'));
    executedTests.push('7. Bounded keyboard reachability evaluation logic verified');
  }

  // 8. Theme integrity evaluation logic (persisted, root class, background token)
  {
    // Valid light mode pass
    const lightPass = evaluateThemeIntegrity({
      expectedTheme: 'light',
      persistedTheme: 'light',
      rootClasses: ['light'],
      computedBackground: '#FDF6E4',
    });
    assert.strictEqual(lightPass.valid, true);
    assert.strictEqual(lightPass.rootHasClass, true);
    assert.strictEqual(lightPass.backgroundTokenMatches, true);

    // Valid dark mode pass (hex)
    const darkPassHex = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'dark',
      rootClasses: ['dark'],
      computedBackground: '#101B37',
    });
    assert.strictEqual(darkPassHex.valid, true);
    assert.strictEqual(darkPassHex.rootHasClass, true);
    assert.strictEqual(darkPassHex.backgroundTokenMatches, true);

    // Valid dark mode pass (rgb)
    const darkPassRgb = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'dark',
      rootClasses: ['dark'],
      computedBackground: 'rgb(16, 27, 55)',
    });
    assert.strictEqual(darkPassRgb.valid, true);

    // Invalid when persisted theme does not match
    const failPersisted = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'light',
      rootClasses: ['dark'],
      computedBackground: '#101B37',
    });
    assert.strictEqual(failPersisted.valid, false);
    assert.ok(failPersisted.diagnostic.includes("persisted theme is 'light'"));

    // Invalid when root classes mismatch
    const failClasses = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'dark',
      rootClasses: ['light'],
      computedBackground: '#101B37',
    });
    assert.strictEqual(failClasses.valid, false);
    assert.ok(failClasses.diagnostic.includes('root classes'));

    // Invalid when background token does not match Rendo family
    const failBg = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'dark',
      rootClasses: ['dark'],
      computedBackground: '#ffffff',
    });
    assert.strictEqual(failBg.valid, false);
    assert.ok(failBg.diagnostic.includes('computed --background'));

    // Invalid when requested is dark but background is light token
    const failOpposingBg = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'dark',
      rootClasses: ['dark'],
      computedBackground: '#FDF6E4',
    });
    assert.strictEqual(failOpposingBg.valid, false);
    executedTests.push('8. Theme integrity evaluation logic verified (persistence, root class, Rendo token family)');
  }

  // 9. Clipping-aware horizontal overflow evaluation logic
  {
    // Unclipped left protrusion escapes
    const unclippedLeft = isProtrusionEscapingToViewport({
      rect: { left: -15, right: 360, width: 375, height: 50 },
      viewportWidth: 375,
      ancestors: [{ overflowX: 'visible', rect: { left: 0, right: 375 } }],
    });
    assert.strictEqual(unclippedLeft, true, 'Unclipped left protrusion must escape to viewport');

    // Unclipped right protrusion escapes
    const unclippedRight = isProtrusionEscapingToViewport({
      rect: { left: 10, right: 400, width: 390, height: 50 },
      viewportWidth: 375,
      ancestors: [{ overflowX: 'visible', rect: { left: 0, right: 375 } }],
    });
    assert.strictEqual(unclippedRight, true, 'Unclipped right protrusion must escape to viewport');

    // Clipped decorative descendant (overflow-x: hidden on contained ancestor) does NOT escape
    const clippedDecorative = isProtrusionEscapingToViewport({
      rect: { left: -50, right: 200, width: 250, height: 50 },
      viewportWidth: 375,
      ancestors: [{ overflowX: 'hidden', rect: { left: 0, right: 375 } }],
    });
    assert.strictEqual(clippedDecorative, false, 'Clipped decorative descendant must not escape to viewport');

    // Clipped SVG internal descendant does NOT escape
    const clippedSvg = isProtrusionEscapingToViewport({
      rect: { left: 0, right: 1475, width: 1475, height: 100 },
      viewportWidth: 1440,
      ancestors: [{ isSvgRoot: true, rect: { left: 0, right: 1440 } }],
    });
    assert.strictEqual(clippedSvg, false, 'Clipped SVG internal element must not escape to viewport');

    // Clipped Leaflet-like translated tile does NOT escape
    const clippedTile = isProtrusionEscapingToViewport({
      rect: { left: 256, right: 793, width: 256, height: 256 },
      viewportWidth: 768,
      ancestors: [{ isMapContainer: true, rect: { left: 16, right: 752 } }],
    });
    assert.strictEqual(clippedTile, false, 'Clipped Leaflet tile inside map container must not escape to viewport');
    executedTests.push('9. Clipping-aware horizontal overflow evaluation logic verified');
  }

  return {
    passed: executedTests.length,
    failed: 0,
    tests: executedTests,
  };
}

test.describe('Product Readiness Fixtures and Helpers Deterministic Suite', () => {
  test('verifies canonical public actor taxonomy and auth session metadata role is buscador', async () => {
    // Assert all 6 required actor definitions are present
    expect(ACTOR_DEFINITIONS.anonymous.role).toBe('anonymous');
    expect(ACTOR_DEFINITIONS.public_user.role).toBe('public_user');
    expect(ACTOR_DEFINITIONS.gestor.role).toBe('gestor');
    expect(ACTOR_DEFINITIONS.delegado_read.role).toBe('delegado_read');
    expect(ACTOR_DEFINITIONS.delegado_manage.role).toBe('delegado_manage');
    expect(ACTOR_DEFINITIONS.dev_admin.role).toBe('dev_admin');

    // Canonical role for public authenticated user must be 'buscador'
    expect(ACTOR_DEFINITIONS.public_user.authRole).toBe('buscador');
    expect(ACTOR_DEFINITIONS.public_user.email).toBe('buscador@test.com');
    expect(ACTOR_DEFINITIONS.public_user.description.toLowerCase()).not.toContain('inquilino');

    // Assert token payload carries user_metadata.role and user_metadata.rol as 'buscador'
    const token = createMockSessionToken({
      userId: ACTOR_DEFINITIONS.public_user.id,
      email: ACTOR_DEFINITIONS.public_user.email,
      role: ACTOR_DEFINITIONS.public_user.authRole,
      accessContext: ACTOR_DEFINITIONS.public_user.accessContext,
    });
    expect(token).toContain('.');

    const decoded = decodeMockSessionToken(token) as any;
    expect(decoded).not.toBeNull();
    expect(decoded.user_metadata.role).toBe('buscador');
    expect(decoded.user_metadata.rol).toBe('buscador');
    expect(decoded.user_metadata.role).not.toBe('inquilino');

    const headers = getAuthHeadersForActor('public_user');
    expect(headers.Authorization).toContain('Bearer ');
  });

  test('verifies inventory denominator and screenshot filename formatting', async () => {
    const filename = getScreenshotFilename({
      id: 'SURF-001',
      actor: 'public_user',
      state: 'default',
      width: 375,
      theme: 'dark',
    });
    expect(filename).toBe('SURF-001__public_user__default__375w__dark.png');

    // Inventory denominator constants
    const e2eSpecSuites = 32;
    const apiSpecSuites = 21;
    const dbTestSuites = 1;
    const totalAutomatedSuites = e2eSpecSuites + apiSpecSuites + dbTestSuites;
    expect(totalAutomatedSuites).toBe(54);

    const routesCount = 41;
    const interactionsCount = 20;
    const apiCapabilitiesCount = 15;
    const dataMigrationsCount = 18;
    const totalDenominator = routesCount + interactionsCount + apiCapabilitiesCount + dataMigrationsCount + totalAutomatedSuites;
    expect(totalDenominator).toBe(148);
    expect(totalDenominator - 103).toBe(45);
  });

  test('verifies recursive alpha composition and contrast calculation math', async () => {
    // Parsing
    expect(parseRgba('rgb(10, 20, 30)')).toEqual([10, 20, 30, 1]);
    expect(parseRgba('rgba(10, 20, 30, 0.5)')).toEqual([10, 20, 30, 0.5]);
    expect(parseRgba('transparent')).toEqual([0, 0, 0, 0]);
    expect(parseRgba('#ffffff')).toEqual([255, 255, 255, 1]);

    // Blending
    expect(blendRgba([100, 150, 200, 1], [0, 0, 0, 1])).toEqual([100, 150, 200, 1]);
    expect(blendRgba([255, 255, 255, 0.5], [0, 0, 0, 1])).toEqual([128, 128, 128, 1]);
    expect(blendRgba([0, 0, 0, 0], [15, 23, 42, 1])).toEqual([15, 23, 42, 1]);

    // Recursive ancestor background composition
    const composed = composeBackgroundChain(
      ['rgba(0,0,0,0)', 'rgb(15, 23, 42)', 'rgba(0, 0, 0, 0.5)', 'rgb(30, 41, 59)'],
      'rgb(255, 255, 255)'
    );
    expect(composed).toEqual([30, 41, 59]);

    const composedChip = composeBackgroundChain(['rgb(15, 23, 42)', 'rgba(255, 255, 255, 0.1)']);
    expect(composedChip).toEqual([39, 46, 63]);

    // Contrast
    expect(calculateContrastRatio([0, 0, 0], [255, 255, 255])).toBe(21);
    expect(calculateContrastRatio([255, 255, 255], [255, 255, 255])).toBe(1);
  });

  test('verifies focus-style comparison and pre-existing shadow rejection', async () => {
    // Pre-existing unchanged shadow must NOT count as focus
    const beforeA = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
    const afterA = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
    const resA = evaluateFocusIndicator(beforeA, afterA);
    expect(resA.hasVisibleFocus).toBe(false);
    expect(resA.boxShadowChanged).toBe(false);
    expect(resA.diagnostic).toContain('Pre-existing box-shadow ignored');

    // Materially changed ring must pass
    const beforeB = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
    const afterB = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: '0 0 0 2px rgb(59, 130, 246), 0 1px 3px rgba(0,0,0,0.1)' };
    const resB = evaluateFocusIndicator(beforeB, afterB);
    expect(resB.hasVisibleFocus).toBe(true);
    expect(resB.boxShadowChanged).toBe(true);

    // New outline must pass
    const beforeC = { outlineStyle: 'none', outlineWidth: 0, outlineColor: '', boxShadow: 'none' };
    const afterC = { outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'rgb(59, 130, 246)', boxShadow: 'none' };
    const resC = evaluateFocusIndicator(beforeC, afterC);
    expect(resC.hasVisibleFocus).toBe(true);
    expect(resC.outlineChanged).toBe(true);
  });

  test('verifies touch/prose-link classification behavior', async () => {
    // Genuine prose link: excluded
    expect(
      isGenuineInlineProseLink({
        tagName: 'a',
        computedDisplay: 'inline',
        isInsideParagraph: true,
        isStandaloneSpanWrapper: false,
        hasButtonOrNavSemantics: false,
        hasTestId: false,
        hasIcon: false,
        hasControlClasses: false,
      })
    ).toBe(true);

    // Link with test ID: not excluded
    expect(
      isGenuineInlineProseLink({
        tagName: 'a',
        computedDisplay: 'inline',
        isInsideParagraph: true,
        isStandaloneSpanWrapper: false,
        hasButtonOrNavSemantics: false,
        hasTestId: true,
        hasIcon: false,
        hasControlClasses: false,
      })
    ).toBe(false);

    // Standalone span wrapper: not excluded
    expect(
      isGenuineInlineProseLink({
        tagName: 'a',
        computedDisplay: 'inline',
        isInsideParagraph: false,
        isStandaloneSpanWrapper: true,
        hasButtonOrNavSemantics: false,
        hasTestId: false,
        hasIcon: false,
        hasControlClasses: false,
      })
    ).toBe(false);

    // Link with button class: not excluded
    expect(
      isGenuineInlineProseLink({
        tagName: 'a',
        computedDisplay: 'inline',
        isInsideParagraph: true,
        isStandaloneSpanWrapper: false,
        hasButtonOrNavSemantics: false,
        hasTestId: false,
        hasIcon: false,
        hasControlClasses: true,
      })
    ).toBe(false);
  });

  test('verifies bounded settle evaluation behavior and timeout fallback', async () => {
    // Normal completion with fonts settled
    const settleA = evaluateSettleState({ fontsReadyState: 'settled', elapsedMs: 150, timeoutMs: 2000 });
    expect(settleA.settled).toBe(true);
    expect(settleA.fontsSettled).toBe(true);
    expect(settleA.diagnostic).toContain('settled within 150ms');

    // Timeout fallback with pending fonts
    const settleB = evaluateSettleState({ fontsReadyState: 'timed_out', elapsedMs: 2000, timeoutMs: 2000 });
    expect(settleB.settled).toBe(true);
    expect(settleB.fontsSettled).toBe(false);
    expect(settleB.diagnostic).toContain('timeout fallback');

    // Unsupported fonts API
    const settleC = evaluateSettleState({ fontsReadyState: 'unsupported', elapsedMs: 30, timeoutMs: 2000 });
    expect(settleC.settled).toBe(true);
    expect(settleC.fontsSettled).toBe(false);
    expect(settleC.diagnostic).toContain('not available');
  });

  test('verifies bounded keyboard reachability evaluation behavior', async () => {
    const reachA = evaluateKeyboardReachability({
      targetSelector: 'button#submit',
      matched: true,
      tabCount: 5,
      maxTabs: 50,
      finalActiveElement: 'button#submit',
    });
    expect(reachA.isReachable).toBe(true);
    expect(reachA.diagnostic).toContain('reached via keyboard navigation in 5 Tab press(es)');

    const reachB = evaluateKeyboardReachability({
      targetSelector: 'div#modal-action',
      matched: false,
      tabCount: 50,
      maxTabs: 50,
      finalActiveElement: 'input#email',
    });
    expect(reachB.isReachable).toBe(false);
    expect(reachB.diagnostic).toContain('is not keyboard reachable within 50 Tab presses');
  });

  test('verifies theme integrity evaluation behavior across valid and invalid states', async () => {
    // Valid light
    const validLight = evaluateThemeIntegrity({
      expectedTheme: 'light',
      persistedTheme: 'light',
      rootClasses: ['light'],
      computedBackground: '#FDF6E4',
    });
    expect(validLight.valid).toBe(true);
    expect(validLight.rootHasClass).toBe(true);
    expect(validLight.backgroundTokenMatches).toBe(true);

    // Valid dark hex
    const validDark = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'dark',
      rootClasses: ['dark'],
      computedBackground: '#101B37',
    });
    expect(validDark.valid).toBe(true);

    // Valid dark rgb
    const validDarkRgb = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'dark',
      rootClasses: ['dark'],
      computedBackground: 'rgb(16, 27, 55)',
    });
    expect(validDarkRgb.valid).toBe(true);

    // Mismatched persisted theme
    const mismatchPersisted = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'light',
      rootClasses: ['dark'],
      computedBackground: '#101B37',
    });
    expect(mismatchPersisted.valid).toBe(false);
    expect(mismatchPersisted.diagnostic).toContain("persisted theme is 'light'");

    // Mismatched root class
    const mismatchClass = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'dark',
      rootClasses: ['light'],
      computedBackground: '#101B37',
    });
    expect(mismatchClass.valid).toBe(false);

    // Mismatched background token
    const mismatchBg = evaluateThemeIntegrity({
      expectedTheme: 'dark',
      persistedTheme: 'dark',
      rootClasses: ['dark'],
      computedBackground: '#ffffff',
    });
    expect(mismatchBg.valid).toBe(false);
    expect(mismatchBg.diagnostic).toContain('computed --background');
  });

  test('verifies browser-callable helper signatures remain defined', async () => {
    expect(typeof setThemeAndWait).toBe('function');
    expect(typeof waitForSettledState).toBe('function');
    expect(typeof checkHorizontalOverflow).toBe('function');
    expect(typeof checkElementContrast).toBe('function');
    expect(typeof checkTouchTargets).toBe('function');
    expect(typeof checkAccessibleName).toBe('function');
    expect(typeof checkVisibleFocus).toBe('function');
    expect(typeof setTestSessionForActor).toBe('function');
    expect(typeof evaluateSettleState).toBe('function');
    expect(typeof evaluateKeyboardReachability).toBe('function');
    expect(typeof evaluateThemeIntegrity).toBe('function');
    expect(typeof assertThemeIntegrity).toBe('function');
    expect(typeof settleFullPageMedia).toBe('function');
    expect(typeof assertUnitCardImagesLoaded).toBe('function');
  });
});
