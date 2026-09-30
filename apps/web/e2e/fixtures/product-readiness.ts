import type { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Standard Product Readiness Verification Helpers for Feature 005.
 * Conforms to FR-011, FR-012, FR-013, FR-026, FR-027, FR-028.
 */

export interface ScreenshotParams {
  id: string;
  actor: string;
  state: string;
  width: number;
  theme: 'light' | 'dark';
}

export interface ContrastResult {
  ratio: number;
  pass: boolean;
  fgColor: string;
  bgColor: string;
  requiredRatio: number;
}

export interface TouchTargetResult {
  tooSmall: number;
  smallDetails: string[];
}

export interface OverflowResult {
  hasOverflow: boolean;
  viewportWidth: number;
  scrollWidth: number;
  offendingElements: string[];
}

export interface ElementFocusStyles {
  outlineStyle: string;
  outlineWidth: number;
  outlineColor: string;
  boxShadow: string;
}

export interface FocusIndicatorResult {
  hasVisibleFocus: boolean;
  outlineChanged: boolean;
  boxShadowChanged: boolean;
  diagnostic: string;
  before: ElementFocusStyles;
  after: ElementFocusStyles;
}

export interface ProseLinkClassificationInput {
  tagName: string;
  computedDisplay: string;
  isInsideParagraph: boolean;
  isStandaloneSpanWrapper: boolean;
  hasButtonOrNavSemantics: boolean;
  hasTestId: boolean;
  hasIcon: boolean;
  hasControlClasses: boolean;
}

export interface SettleResult {
  settled: boolean;
  fontsSettled: boolean;
  durationMs: number;
  diagnostic: string;
}

export interface SettleStateInput {
  fontsReadyState: 'settled' | 'timed_out' | 'unsupported';
  elapsedMs: number;
  timeoutMs: number;
}

export interface KeyboardReachabilityInput {
  targetSelector: string;
  matched: boolean;
  tabCount: number;
  maxTabs: number;
  finalActiveElement?: string;
}

export interface KeyboardReachabilityResult {
  isReachable: boolean;
  diagnostic: string;
}

export interface CheckVisibleFocusOptions {
  maxTabs?: number;
}

/**
 * Generates deterministic screenshot filename conforming to Feature 005 conventions.
 * Format: {ID}__{actor}__{state}__{width}w__{theme}.png
 */
export function getScreenshotFilename(params: ScreenshotParams): string {
  return `${params.id}__${params.actor}__${params.state}__${params.width}w__${params.theme}.png`;
}

/**
 * Evaluates settle outcome given font loading state and bounded time budget.
 */
export function evaluateSettleState(input: SettleStateInput): SettleResult {
  const fontsSettled = input.fontsReadyState === 'settled';
  let diagnostic = '';
  if (fontsSettled && input.elapsedMs < input.timeoutMs) {
    diagnostic = `State and document fonts settled within ${input.elapsedMs}ms (bound: ${input.timeoutMs}ms)`;
  } else if (input.fontsReadyState === 'unsupported') {
    diagnostic = `State settled within ${input.elapsedMs}ms (document.fonts API not available)`;
  } else {
    diagnostic = `State settled via timeout fallback at ${input.elapsedMs}ms (bound: ${input.timeoutMs}ms, fonts state: ${input.fontsReadyState})`;
  }

  return {
    settled: true,
    fontsSettled,
    durationMs: input.elapsedMs,
    diagnostic,
  };
}

export interface ThemeIntegrityInput {
  expectedTheme: 'light' | 'dark';
  persistedTheme: string | null;
  rootClasses: string[];
  computedBackground: string;
}

export interface ThemeIntegrityResult {
  valid: boolean;
  expectedTheme: 'light' | 'dark';
  persistedTheme: string | null;
  rootHasClass: boolean;
  backgroundTokenMatches: boolean;
  computedBackground: string;
  diagnostic: string;
}

/**
 * Checks whether a CSS color or token string matches Rendo's light mode background token (#FDF6E4).
 */
export function isLightBackground(val: string): boolean {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  if (clean === '#fdf6e4') return true;
  const rgba = parseRgba(clean);
  return rgba[0] === 253 && rgba[1] === 246 && rgba[2] === 228;
}

/**
 * Checks whether a CSS color or token string matches Rendo's dark mode background token (#101B37).
 */
export function isDarkBackground(val: string): boolean {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  if (clean === '#101b37') return true;
  const rgba = parseRgba(clean);
  return rgba[0] === 16 && rgba[1] === 27 && rgba[2] === 55;
}

/**
 * Pure evaluation function for theme integrity. Verifies:
 * 1. Persisted theme in storage matches expected theme.
 * 2. Root element classes strictly contain expected theme and not opposing theme.
 * 3. Computed --background matches the corresponding Rendo light/dark token family.
 */
export function evaluateThemeIntegrity(input: ThemeIntegrityInput): ThemeIntegrityResult {
  const { expectedTheme, persistedTheme, rootClasses, computedBackground } = input;
  const rootHasExpected = rootClasses.includes(expectedTheme);
  const otherTheme = expectedTheme === 'light' ? 'dark' : 'light';
  const rootHasOther = rootClasses.includes(otherTheme);
  const rootHasClass = rootHasExpected && !rootHasOther;

  const persistedMatches = persistedTheme === expectedTheme;
  const backgroundTokenMatches =
    expectedTheme === 'light'
      ? isLightBackground(computedBackground)
      : isDarkBackground(computedBackground);

  const valid = persistedMatches && rootHasClass && backgroundTokenMatches;
  let diagnostic = '';
  if (!valid) {
    const reasons: string[] = [];
    if (!persistedMatches) reasons.push(`persisted theme is '${persistedTheme}' (expected '${expectedTheme}')`);
    if (!rootHasClass) reasons.push(`root classes [${rootClasses.join(', ')}] do not strictly match '${expectedTheme}'`);
    if (!backgroundTokenMatches) reasons.push(`computed --background '${computedBackground}' does not match ${expectedTheme} Rendo token family`);
    diagnostic = `Theme integrity failed: ${reasons.join('; ')}`;
  } else {
    diagnostic = `Theme integrity verified for ${expectedTheme} (persisted: '${persistedTheme}', rootClass: '${expectedTheme}', --background: '${computedBackground}')`;
  }

  return {
    valid,
    expectedTheme,
    persistedTheme,
    rootHasClass,
    backgroundTokenMatches,
    computedBackground,
    diagnostic,
  };
}

/**
 * In-page hard assertion of theme integrity.
 */
export async function assertThemeIntegrity(
  page: Page,
  expectedTheme: 'light' | 'dark'
): Promise<ThemeIntegrityResult> {
  const state = await page.evaluate(() => {
    let persisted: string | null = null;
    try {
      persisted = localStorage.getItem('theme');
    } catch {}
    const rootClasses = Array.from(document.documentElement.classList);
    const computedBg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
    return {
      persistedTheme: persisted,
      rootClasses,
      computedBackground: computedBg,
    };
  });

  const result = evaluateThemeIntegrity({
    expectedTheme,
    persistedTheme: state.persistedTheme,
    rootClasses: state.rootClasses,
    computedBackground: state.computedBackground,
  });

  if (!result.valid) {
    throw new Error(`[assertThemeIntegrity] ${result.diagnostic}`);
  }

  return result;
}

/**
 * Sets theme and waits for fonts, transitions, and style updates to settle.
 * Requests reduced motion and color scheme via Playwright media emulation, persists to localStorage
 * and cookie to ensure next-themes hydration stability, and hard-asserts theme integrity.
 */
export async function setThemeAndWait(
  page: Page,
  theme: 'light' | 'dark',
  timeoutMs = 2000
): Promise<SettleResult> {
  // Request reduced motion and color scheme through Playwright media emulation
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });

  await page.evaluate((t) => {
    try {
      localStorage.setItem('theme', t);
      document.cookie = `theme=${t}; path=/; max-age=31536000`;
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: t }));
    } catch {}
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);

  const settle = await waitForSettledState(page, timeoutMs);

  // Validate theme integrity; if next-themes reverted during render, re-enforce and settle
  const isHealthy = await page.evaluate((t) => {
    const hasClass = document.documentElement.classList.contains(t);
    let pers = '';
    try {
      pers = localStorage.getItem('theme') || '';
    } catch {}
    return hasClass && pers === t;
  }, theme);

  if (!isHealthy) {
    await page.evaluate((t) => {
      try {
        localStorage.setItem('theme', t);
        document.cookie = `theme=${t}; path=/; max-age=31536000`;
      } catch {}
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(t);
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await waitForSettledState(page, Math.min(timeoutMs, 500));
  }

  await assertThemeIntegrity(page, theme);
  return settle;
}

/**
 * Progressively scrolls down the page in bounded steps, waits for images in each
 * segment to settle, and scrolls back to the top before capture.
 */
export async function settleFullPageMedia(
  page: Page,
  options: { stepPx?: number; maxScrollSteps?: number; timeoutMs?: number } = {}
): Promise<{ settled: boolean; steps: number; imagesLoaded: number }> {
  const stepPx = options.stepPx ?? 400;
  const maxScrollSteps = options.maxScrollSteps ?? 15;
  const timeoutMs = options.timeoutMs ?? 3000;

  const result = await page.evaluate(
    async ({ step, maxSteps, timeout }) => {
      const scrollHeight = () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      let currentScroll = 0;
      let stepsTaken = 0;

      while (currentScroll < scrollHeight() && stepsTaken < maxSteps) {
        window.scrollBy(0, step);
        currentScroll += step;
        stepsTaken++;
        await new Promise((resolve) => setTimeout(resolve, 60));
      }

      const startTime = performance.now();
      const images = Array.from(document.querySelectorAll('img'));
      const pendingImages = images.filter((img) => !img.complete);

      if (pendingImages.length > 0) {
        await Promise.all(
          pendingImages.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
              const remaining = Math.max(10, timeout - (performance.now() - startTime));
              const timer = setTimeout(() => resolve(), remaining);
              img.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
              img.addEventListener('error', () => { clearTimeout(timer); resolve(); }, { once: true });
            });
          })
        );
      }

      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 80));

      const loadedCount = images.filter((img) => img.complete && img.naturalWidth > 0).length;

      return {
        settled: true,
        steps: stepsTaken,
        imagesLoaded: loadedCount,
      };
    },
    { step: stepPx, maxSteps: maxScrollSteps, timeout: timeoutMs }
  );

  await waitForSettledState(page, 500);
  return result;
}

/**
 * Hard-asserts that visible unit-card images from the deterministic mock are loaded
 * with non-zero natural dimensions before Home/Catalog captures.
 */
export async function assertUnitCardImagesLoaded(
  page: Page
): Promise<{ count: number; loaded: number }> {
  const evalResult = await page.evaluate(() => {
    const cardImages = Array.from(
      document.querySelectorAll('a[href*="/unidades/"] img, [data-testid*="unidad"] img, .aspect-\\[16\\/10\\] img, .aspect-\\[4\\/3\\] img')
    ) as HTMLImageElement[];

    if (cardImages.length === 0) {
      return { count: 0, loaded: 0, failures: [] };
    }

    const failures: string[] = [];
    let loaded = 0;

    for (const img of cardImages) {
      if (img.complete && img.naturalWidth > 0) {
        loaded++;
      } else {
        failures.push(`src="${img.src?.slice(0, 80)}" complete=${img.complete} naturalWidth=${img.naturalWidth}`);
      }
    }

    return {
      count: cardImages.length,
      loaded,
      failures,
    };
  });

  if (evalResult.count === 0) {
    throw new Error('[assertUnitCardImagesLoaded] No unit card images found on page to verify');
  }

  if (evalResult.loaded < evalResult.count) {
    throw new Error(
      `[assertUnitCardImagesLoaded] Failed: ${evalResult.loaded}/${evalResult.count} loaded. Failures: ${evalResult.failures.join(', ')}`
    );
  }

  return { count: evalResult.count, loaded: evalResult.loaded };
}

/**
 * Waits for document fonts, transitions, and dynamic styles to settle with an enforced upper bound.
 * Never hangs indefinitely on document.fonts.ready.
 */
export async function waitForSettledState(page: Page, timeoutMs = 2000): Promise<SettleResult> {
  const start = Date.now();
  let evalResult: { fontsReadyState: 'settled' | 'timed_out' | 'unsupported'; elapsedMs: number };

  try {
    evalResult = await page.evaluate(async (maxWait) => {
      const t0 = performance.now();
      if (!('fonts' in document) || !document.fonts || !document.fonts.ready) {
        return {
          fontsReadyState: 'unsupported' as const,
          elapsedMs: Math.round(performance.now() - t0),
        };
      }

      // Reserve at least 60ms for requestAnimationFrame cycle
      const fontWaitLimit = Math.max(0, maxWait - 60);
      const fontTimer = new Promise<'timed_out'>((resolve) =>
        setTimeout(() => resolve('timed_out'), fontWaitLimit)
      );
      const fontPromise = document.fonts.ready
        .then(() => 'settled' as const)
        .catch(() => 'timed_out' as const);

      const winner = await Promise.race([fontPromise, fontTimer]);

      const elapsed = performance.now() - t0;
      const remaining = Math.max(0, maxWait - elapsed);
      if (remaining > 10) {
        await new Promise((resolve) =>
          requestAnimationFrame(() => setTimeout(resolve, Math.min(50, remaining)))
        );
      }

      return {
        fontsReadyState: winner,
        elapsedMs: Math.round(performance.now() - t0),
      };
    }, timeoutMs);
  } catch {
    const elapsed = Date.now() - start;
    return evaluateSettleState({
      fontsReadyState: 'timed_out',
      elapsedMs: elapsed,
      timeoutMs,
    });
  }

  const totalElapsed = Date.now() - start;
  return evaluateSettleState({
    fontsReadyState: evalResult.fontsReadyState,
    elapsedMs: Math.max(evalResult.elapsedMs, totalElapsed),
    timeoutMs,
  });
}

/**
 * Captures a deterministic screenshot with automatic directory creation and naming.
 * Hard-asserts theme integrity immediately before capturing.
 */
export async function captureReadinessScreenshot(
  page: Page,
  targetDir: string,
  params: ScreenshotParams,
  options: { fullPage?: boolean } = {}
): Promise<string> {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Hard assertion: immediately before capturing, theme integrity must be verified
  await assertThemeIntegrity(page, params.theme);

  const filename = getScreenshotFilename(params);
  const filePath = path.join(targetDir, filename);

  await page.screenshot({
    path: filePath,
    fullPage: options.fullPage ?? true,
  });

  return filePath;
}

/**
 * Pure color parsing helper supporting rgb, rgba, hex, and transparent.
 */
export function parseRgba(colorStr: string): [number, number, number, number] {
  if (!colorStr || colorStr === 'transparent') {
    return [0, 0, 0, 0];
  }
  const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (m) {
    return [
      parseInt(m[1], 10),
      parseInt(m[2], 10),
      parseInt(m[3], 10),
      m[4] !== undefined ? parseFloat(m[4]) : 1,
    ];
  }
  const hex = colorStr.trim().replace(/^#/, '');
  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
    return [r, g, b, a];
  }
  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  return [0, 0, 0, 1];
}

/**
 * Pure Porter-Duff 'over' compositing of a top layer onto a bottom layer.
 */
export function blendRgba(
  top: [number, number, number, number],
  bottom: [number, number, number, number]
): [number, number, number, number] {
  const [tr, tg, tb, ta] = top;
  const [br, bg, bb, ba] = bottom;

  if (ta <= 0) return [br, bg, bb, ba];
  if (ta >= 1) return [tr, tg, tb, 1];

  const outAlpha = ta + ba * (1 - ta);
  if (outAlpha <= 0) return [0, 0, 0, 0];

  const outR = Math.round((tr * ta + br * ba * (1 - ta)) / outAlpha);
  const outG = Math.round((tg * ta + bg * ba * (1 - ta)) / outAlpha);
  const outB = Math.round((tb * ta + bb * ba * (1 - ta)) / outAlpha);

  return [outR, outG, outB, outAlpha];
}

/**
 * Pure recursive background composition through an ordered chain from canvas/body to element.
 */
export function composeBackgroundChain(
  layers: Array<[number, number, number, number] | string>,
  fallbackBase: [number, number, number, number] | string = [255, 255, 255, 1]
): [number, number, number] {
  const baseRgba = typeof fallbackBase === 'string' ? parseRgba(fallbackBase) : fallbackBase;
  let current: [number, number, number, number] = [baseRgba[0], baseRgba[1], baseRgba[2], 1];

  for (const layer of layers) {
    const layerRgba = typeof layer === 'string' ? parseRgba(layer) : layer;
    if (layerRgba[3] > 0) {
      current = blendRgba(layerRgba, current);
    }
  }

  return [current[0], current[1], current[2]];
}

/**
 * WCAG 2.1 relative luminance calculation.
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * WCAG 2.1 AA contrast ratio between two RGB colors.
 */
export function calculateContrastRatio(
  fgRgb: [number, number, number],
  bgRgb: [number, number, number]
): number {
  const l1 = getRelativeLuminance(fgRgb[0], fgRgb[1], fgRgb[2]);
  const l2 = getRelativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Evaluates whether focus styles demonstrate a genuine focus indicator,
 * ignoring pre-existing box shadows that do not materially change.
 */
export function evaluateFocusIndicator(
  before: ElementFocusStyles,
  after: ElementFocusStyles
): FocusIndicatorResult {
  const beforeShadow = (before.boxShadow || '').trim();
  const afterShadow = (after.boxShadow || '').trim();

  const isOutlineVisible = (styles: ElementFocusStyles): boolean => {
    if (!styles.outlineStyle || styles.outlineStyle === 'none') return false;
    if (styles.outlineWidth < 1) return false;
    if (styles.outlineColor === 'transparent' || styles.outlineColor === 'rgba(0, 0, 0, 0)') return false;
    return true;
  };

  const beforeHasOutline = isOutlineVisible(before);
  const afterHasOutline = isOutlineVisible(after);

  const outlineChanged =
    afterHasOutline &&
    (!beforeHasOutline ||
      before.outlineWidth !== after.outlineWidth ||
      before.outlineStyle !== after.outlineStyle ||
      before.outlineColor !== after.outlineColor);

  const isShadowPresent = (s: string) => s !== 'none' && s !== '' && s !== 'none, none';
  const afterHasShadow = isShadowPresent(afterShadow);
  const boxShadowChanged = afterHasShadow && afterShadow !== beforeShadow;

  const hasVisibleFocus = outlineChanged || boxShadowChanged;

  let diagnostic = 'No visible focus indicator detected';
  if (outlineChanged && boxShadowChanged) {
    diagnostic = `Visible focus detected via both outline (${after.outlineWidth}px ${after.outlineStyle} ${after.outlineColor}) and box-shadow change`;
  } else if (outlineChanged) {
    diagnostic = `Visible focus detected via outline change: ${before.outlineWidth}px ${before.outlineStyle} -> ${after.outlineWidth}px ${after.outlineStyle} ${after.outlineColor}`;
  } else if (boxShadowChanged) {
    diagnostic = `Visible focus detected via box-shadow change (before: "${beforeShadow || 'none'}", after: "${afterShadow}")`;
  } else if (afterHasShadow && !boxShadowChanged) {
    diagnostic = `Pre-existing box-shadow ignored (did not materially change upon focus: "${afterShadow}")`;
  }

  return {
    hasVisibleFocus,
    outlineChanged,
    boxShadowChanged,
    diagnostic,
    before,
    after,
  };
}

/**
 * Pure classifier: returns true ONLY for genuine inline prose links inside text paragraphs.
 * Never excludes links with button/nav semantics, test IDs, icons, control classes, or standalone span wrappers.
 */
export function isGenuineInlineProseLink(input: ProseLinkClassificationInput): boolean {
  if (input.tagName.toLowerCase() !== 'a') return false;
  if (input.computedDisplay !== 'inline') return false;
  if (input.hasButtonOrNavSemantics) return false;
  if (input.hasTestId) return false;
  if (input.hasIcon) return false;
  if (input.hasControlClasses) return false;
  if (input.isStandaloneSpanWrapper) return false;
  return input.isInsideParagraph;
}

export interface ProtrusionClippingInput {
  rect: { left: number; right: number; width: number; height: number };
  viewportWidth: number;
  ancestors: Array<{
    tagName?: string;
    overflowX?: string;
    rect?: { left: number; right: number };
    isSvgRoot?: boolean;
    isMapContainer?: boolean;
  }>;
}

/**
 * Pure classifier: determines whether a protruding element can escape to the document viewport,
 * or if it is intentionally clipped by an ancestor with overflow-x: hidden/clip, SVG root, or map container.
 */
export function isProtrusionEscapingToViewport(input: ProtrusionClippingInput): boolean {
  const { rect, viewportWidth, ancestors } = input;
  if (rect.width <= 0 && rect.height <= 0) return false;

  const isLeft = rect.left < -1;
  const isRight = rect.right > viewportWidth + 1;
  if (!isLeft && !isRight) return false;

  for (const anc of ancestors) {
    const ox = anc.overflowX || '';
    const isClippingStyle = ox === 'hidden' || ox === 'clip';
    const isClipping = isClippingStyle || anc.isSvgRoot || anc.isMapContainer;

    if (isClipping) {
      const ancRect = anc.rect ?? { left: 0, right: viewportWidth };
      const leftContained = ancRect.left >= -1;
      const rightContained = ancRect.right <= viewportWidth + 1;

      if (isLeft && !isRight && leftContained) return false;
      if (isRight && !isLeft && rightContained) return false;
      if (isLeft && isRight && leftContained && rightContained) return false;
    }
  }

  return true;
}

/**
 * Checks for horizontal overflow on the document and identifies protruding elements,
 * ignoring descendants intentionally clipped by an ancestor with overflow-x: hidden/clip,
 * SVG roots, or map containers whose outer boundaries do not escape the viewport.
 */
export async function checkHorizontalOverflow(page: Page): Promise<OverflowResult> {
  return await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const hasRightScroll = scrollWidth > viewportWidth + 1;
    const offendingElements: string[] = [];

    // Helper to determine if an element's protrusion is clipped by an ancestor
    function isElementClipped(el: Element, leftProtruding: boolean, rightProtruding: boolean): boolean {
      // 1. Check if enclosed in an SVG root whose viewport does not escape
      const svgRoot = el.closest('svg');
      if (svgRoot && svgRoot !== el) {
        const svgRect = svgRoot.getBoundingClientRect();
        const svgStyle = window.getComputedStyle(svgRoot);
        const svgClips = svgStyle.overflow !== 'visible';
        const svgLeftContained = svgRect.left >= -1;
        const svgRightContained = svgRect.right <= viewportWidth + 1;
        if (svgClips) {
          if (leftProtruding && !rightProtruding && svgLeftContained) return true;
          if (rightProtruding && !leftProtruding && svgRightContained) return true;
          if (leftProtruding && rightProtruding && svgLeftContained && svgRightContained) return true;
        }
      }

      // 2. Check if enclosed in a Leaflet map container
      const mapContainer = el.closest('.leaflet-container, [class*="map-container"], [data-testid="map-container"]');
      if (mapContainer && mapContainer !== el) {
        const mapRect = mapContainer.getBoundingClientRect();
        const mapLeftContained = mapRect.left >= -1;
        const mapRightContained = mapRect.right <= viewportWidth + 1;
        if (mapLeftContained && mapRightContained) return true;
      }

      // 3. Walk parent elements checking overflow-x / overflow clipping
      let curr: Element | null = el.parentElement;
      while (curr && curr !== document.documentElement) {
        const style = window.getComputedStyle(curr);
        const ox = style.overflowX;
        const o = style.overflow;
        const clips = ox === 'hidden' || ox === 'clip' || o === 'hidden' || o === 'clip';

        if (clips) {
          const parentRect = curr.getBoundingClientRect();
          const parentLeftContained = parentRect.left >= -1;
          const parentRightContained = parentRect.right <= viewportWidth + 1;

          if (leftProtruding && !rightProtruding && parentLeftContained) {
            return true;
          }
          if (rightProtruding && !leftProtruding && parentRightContained) {
            return true;
          }
          if (leftProtruding && rightProtruding && parentLeftContained && parentRightContained) {
            return true;
          }
        }
        curr = curr.parentElement;
      }

      return false;
    }

    const all = document.querySelectorAll('*');
    for (const el of Array.from(all)) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) continue;

      const isLeft = rect.left < -1;
      const isRight = rect.right > viewportWidth + 1;
      if (!isLeft && !isRight) continue;

      // Check if intentionally clipped by ancestor or SVG/map container
      if (isElementClipped(el, isLeft, isRight)) {
        continue;
      }

      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string'
        ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}`
        : '';

      if (isLeft) {
        offendingElements.push(`${tag}${id}${cls} (unclipped left: ${Math.round(rect.left)}px < 0px)`);
      }
      if (isRight) {
        offendingElements.push(`${tag}${id}${cls} (unclipped right: ${Math.round(rect.right)}px > ${viewportWidth}px)`);
      }

      if (offendingElements.length >= 10) break;
    }

    const hasOverflow = hasRightScroll || offendingElements.length > 0;

    return {
      hasOverflow,
      viewportWidth,
      scrollWidth,
      offendingElements,
    };
  });
}

/**
 * Evaluates WCAG 2.1 AA computed contrast by recursively composing all visible ancestor backgrounds
 * to the document/body canvas, using optional base only as final fallback.
 */
export async function checkElementContrast(
  page: Page,
  selector: string,
  options: { minRatio?: number; baseBg?: string } = {}
): Promise<ContrastResult> {
  const minRatio = options.minRatio ?? 4.5;
  const baseBg = options.baseBg ?? 'rgb(255, 255, 255)';

  return await page.evaluate(
    ({ sel, requiredRatio, baseBgColor }) => {
      function parseRgbaStr(colorStr: string): [number, number, number, number] {
        if (!colorStr || colorStr === 'transparent') return [0, 0, 0, 0];
        const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m) {
          return [
            parseInt(m[1], 10),
            parseInt(m[2], 10),
            parseInt(m[3], 10),
            m[4] !== undefined ? parseFloat(m[4]) : 1,
          ];
        }
        return [0, 0, 0, 1];
      }

      function blend(
        top: [number, number, number, number],
        bottom: [number, number, number, number]
      ): [number, number, number, number] {
        const [tr, tg, tb, ta] = top;
        const [br, bg, bb, ba] = bottom;
        if (ta <= 0) return [br, bg, bb, ba];
        if (ta >= 1) return [tr, tg, tb, 1];
        const outAlpha = ta + ba * (1 - ta);
        if (outAlpha <= 0) return [0, 0, 0, 0];
        return [
          Math.round((tr * ta + br * ba * (1 - ta)) / outAlpha),
          Math.round((tg * ta + bg * ba * (1 - ta)) / outAlpha),
          Math.round((tb * ta + bb * ba * (1 - ta)) / outAlpha),
          outAlpha,
        ];
      }

      function getLum(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      const el = document.querySelector(sel);
      if (!el) {
        return {
          ratio: 0,
          pass: false,
          fgColor: 'none',
          bgColor: 'none',
          requiredRatio: requiredRatio ?? 4.5,
        };
      }

      const style = window.getComputedStyle(el);
      const fgRgba = parseRgbaStr(style.color);

      // Walk up parents to documentElement, collecting from top-to-bottom
      const chain: HTMLElement[] = [];
      let curr: HTMLElement | null = el as HTMLElement;
      while (curr) {
        chain.unshift(curr);
        curr = curr.parentElement;
      }

      // Start with fallback canvas base
      const fallbackRgba = parseRgbaStr(baseBgColor);
      let composite: [number, number, number, number] = [fallbackRgba[0], fallbackRgba[1], fallbackRgba[2], 1];

      for (const node of chain) {
        const nodeStyle = window.getComputedStyle(node);
        const nodeBg = parseRgbaStr(nodeStyle.backgroundColor);
        if (nodeBg[3] > 0) {
          composite = blend(nodeBg, composite);
        }
      }

      const effectiveBg: [number, number, number] = [composite[0], composite[1], composite[2]];
      const effectiveFg = fgRgba[3] < 1 
        ? blend(fgRgba, [effectiveBg[0], effectiveBg[1], effectiveBg[2], 1])
        : fgRgba;

      const fontSize = parseFloat(style.fontSize) || 16;
      const fontWeight = parseInt(style.fontWeight, 10) || (style.fontWeight === 'bold' ? 700 : 400);
      const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const effectiveRequiredRatio = requiredRatio !== undefined && requiredRatio !== 4.5
        ? requiredRatio
        : (isLarge ? 3.0 : 4.5);

      const l1 = getLum(effectiveFg[0], effectiveFg[1], effectiveFg[2]);
      const l2 = getLum(effectiveBg[0], effectiveBg[1], effectiveBg[2]);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      const ratio = (lighter + 0.05) / (darker + 0.05);

      return {
        ratio: Math.round(ratio * 100) / 100,
        pass: ratio >= effectiveRequiredRatio,
        fgColor: `rgb(${effectiveFg[0]},${effectiveFg[1]},${effectiveFg[2]})`,
        bgColor: `rgb(${effectiveBg[0]},${effectiveBg[1]},${effectiveBg[2]})`,
        requiredRatio: effectiveRequiredRatio,
      };
    },
    { sel: selector, requiredRatio: options.minRatio, baseBgColor: baseBg }
  );
}

export interface ComprehensiveContrastFailure {
  selector: string;
  tag: string;
  text: string;
  fontSize: number;
  fontWeight: number;
  isLarge: boolean;
  ratio: number;
  requiredRatio: number;
  fgColor: string;
  bgColor: string;
}

export interface ComprehensiveContrastResult {
  pass: boolean;
  totalEvaluated: number;
  failures: ComprehensiveContrastFailure[];
}

/**
 * Evaluates WCAG contrast comprehensively across headings, body text, links, buttons, inputs, tabs, and dialogs.
 */
export async function checkComprehensiveContrast(
  page: Page,
  options: { baseBg?: string } = {}
): Promise<ComprehensiveContrastResult> {
  const baseBg = options.baseBg ?? 'rgb(255, 255, 255)';

  return await page.evaluate(({ baseBgColor }) => {
    function parseRgbaStr(colorStr: string): [number, number, number, number] {
      if (!colorStr || colorStr === 'transparent') return [0, 0, 0, 0];
      const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m) {
        return [
          parseInt(m[1], 10),
          parseInt(m[2], 10),
          parseInt(m[3], 10),
          m[4] !== undefined ? parseFloat(m[4]) : 1,
        ];
      }
      return [0, 0, 0, 1];
    }

    function blend(
      top: [number, number, number, number],
      bottom: [number, number, number, number]
    ): [number, number, number, number] {
      const [tr, tg, tb, ta] = top;
      const [br, bg, bb, ba] = bottom;
      if (ta <= 0) return [br, bg, bb, ba];
      if (ta >= 1) return [tr, tg, tb, 1];
      const outAlpha = ta + ba * (1 - ta);
      if (outAlpha <= 0) return [0, 0, 0, 0];
      return [
        Math.round((tr * ta + br * ba * (1 - ta)) / outAlpha),
        Math.round((tg * ta + bg * ba * (1 - ta)) / outAlpha),
        Math.round((tb * ta + bb * ba * (1 - ta)) / outAlpha),
        outAlpha,
      ];
    }

    function getLum(r: number, g: number, b: number): number {
      const [rs, gs, bs] = [r, g, b].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    const candidateElements = Array.from(
      document.querySelectorAll(
        'h1, h2, h3, p, a, button, input:not([type="hidden"]), select, [role="tab"], [role="button"], [role="dialog"]'
      )
    );

    const failures: ComprehensiveContrastFailure[] = [];
    let totalEvaluated = 0;

    for (const el of candidateElements) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.offsetParent === null && htmlEl.tagName.toLowerCase() !== 'body') continue;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const style = window.getComputedStyle(htmlEl);
      if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) < 0.1) continue;

      let text = htmlEl.textContent?.trim() || '';
      if (htmlEl instanceof HTMLInputElement) {
        text = htmlEl.value || htmlEl.placeholder || '';
      }
      if (!text) continue;

      // Avoid duplicate failure if child has identical text and was evaluated
      const hasChildWithSameText = Array.from(htmlEl.children).some(
        (child) => child.textContent?.trim() === text && (child as HTMLElement).offsetParent !== null
      );
      if (hasChildWithSameText) continue;

      totalEvaluated++;

      const fontSize = parseFloat(style.fontSize) || 16;
      const fontWeight = parseInt(style.fontWeight, 10) || (style.fontWeight === 'bold' ? 700 : 400);
      const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const requiredRatio = isLarge ? 3.0 : 4.5;

      const fgRgba = parseRgbaStr(style.color);

      const chain: HTMLElement[] = [];
      let curr: HTMLElement | null = htmlEl;
      while (curr) {
        chain.unshift(curr);
        curr = curr.parentElement;
      }

      const fallbackRgba = parseRgbaStr(baseBgColor);
      let composite: [number, number, number, number] = [fallbackRgba[0], fallbackRgba[1], fallbackRgba[2], 1];

      for (const node of chain) {
        const nodeStyle = window.getComputedStyle(node);
        const nodeBg = parseRgbaStr(nodeStyle.backgroundColor);
        if (nodeBg[3] > 0) {
          composite = blend(nodeBg, composite);
        }
      }

      const effectiveBg: [number, number, number] = [composite[0], composite[1], composite[2]];
      const effectiveFg = fgRgba[3] < 1
        ? blend(fgRgba, [effectiveBg[0], effectiveBg[1], effectiveBg[2], 1])
        : fgRgba;

      const l1 = getLum(effectiveFg[0], effectiveFg[1], effectiveFg[2]);
      const l2 = getLum(effectiveBg[0], effectiveBg[1], effectiveBg[2]);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      const ratio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;

      if (ratio < requiredRatio) {
        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : '';
        const cls = typeof htmlEl.className === 'string' && htmlEl.className
          ? `.${htmlEl.className.split(' ').filter(Boolean).slice(0, 2).join('.')}`
          : '';
        const shortText = text.length > 30 ? text.slice(0, 27) + '...' : text;
        failures.push({
          selector: `${tag}${id}${cls}`,
          tag,
          text: shortText,
          fontSize,
          fontWeight,
          isLarge,
          ratio,
          requiredRatio,
          fgColor: `rgb(${effectiveFg[0]},${effectiveFg[1]},${effectiveFg[2]})`,
          bgColor: `rgb(${effectiveBg[0]},${effectiveBg[1]},${effectiveBg[2]})`,
        });
      }
    }

    return {
      pass: failures.length === 0,
      totalEvaluated,
      failures,
    };
  }, { baseBgColor: baseBg });
}

/**
 * Validates that all interactive controls have at least 44x44px touch bounding box or wrapper,
 * excluding only genuine inline prose links in paragraph context.
 */
export async function checkTouchTargets(page: Page, minSize = 44): Promise<TouchTargetResult> {
  return await page.evaluate((targetSize) => {
    const interactive = Array.from(
      document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [role="checkbox"], [role="radio"]'
      )
    );

    let tooSmall = 0;
    const smallDetails: string[] = [];

    for (const el of interactive) {
      if (
        (el as HTMLElement).offsetParent === null ||
        window.getComputedStyle(el).display === 'none' ||
        window.getComputedStyle(el).visibility === 'hidden'
      ) {
        continue;
      }

      // Skip third-party Leaflet map container controls (zoom buttons and attribution)
      if (el.closest('.leaflet-container, [class*="map-container"], [data-testid="map-container"]')) {
        continue;
      }

      // Skip framework hidden inputs and sr-only 1x1px controls
      const isHiddenInput =
        (el as HTMLInputElement).type === 'hidden' ||
        el.getAttribute('aria-hidden') === 'true' ||
        el.getAttribute('tabindex') === '-1' ||
        (el.tagName.toLowerCase() === 'input' && (el.id.includes('hidden') || el.id.includes('base-ui')));
      if (isHiddenInput) {
        continue;
      }

      // Check if it's a link
      if (el.tagName.toLowerCase() === 'a') {
        const computedStyle = window.getComputedStyle(el);
        const display = computedStyle.display;

        const pAncestor = el.closest('p');
        const isInsideParagraph = pAncestor !== null;
        const spanAncestor = el.closest('span');
        const isStandaloneSpanWrapper = spanAncestor !== null && !isInsideParagraph;

        const role = el.getAttribute('role') || '';
        const hasButtonOrNavSemantics =
          role === 'button' || role === 'tab' || role === 'menuitem' || role === 'link';
        const hasTestId = el.hasAttribute('data-testid');
        const hasIcon = el.querySelector('svg, i, [data-icon], img') !== null;
        const cls = typeof el.className === 'string' ? el.className : '';
        const hasControlClasses = /(?:^|\s)(btn|button|control|badge|pill|nav-|menu-)/i.test(cls);

        const isProse =
          display === 'inline' &&
          isInsideParagraph &&
          !isStandaloneSpanWrapper &&
          !hasButtonOrNavSemantics &&
          !hasTestId &&
          !hasIcon &&
          !hasControlClasses;

        if (isProse) {
          continue; // Exclude genuine inline prose links
        }
      }

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      const isSelfValid = rect.width >= targetSize && rect.height >= targetSize;
      const wrapper = el.closest('label') || el.closest('[data-touch-target]');
      const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : null;
      const isWrapperValid = wrapperRect ? wrapperRect.width >= targetSize && wrapperRect.height >= targetSize : false;

      if (!isSelfValid && !isWrapperValid) {
        tooSmall++;
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const testId = el.getAttribute('data-testid') ? `[data-testid="${el.getAttribute('data-testid')}"]` : '';
        smallDetails.push(`${tag}${id}${testId} (${Math.round(rect.width)}x${Math.round(rect.height)}px)`);
        if (smallDetails.length >= 10) break;
      }
    }

    return { tooSmall, smallDetails };
  }, minSize);
}

/**
 * Checks if an interactive element has an accessible name.
 */
export async function checkAccessibleName(page: Page, selector: string): Promise<{ hasName: boolean; name: string }> {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { hasName: false, name: '' };

    const ariaLabel = el.getAttribute('aria-label') || '';
    const ariaLabelledby = el.getAttribute('aria-labelledby');
    let labelledByText = '';
    if (ariaLabelledby) {
      const ref = document.getElementById(ariaLabelledby);
      if (ref) labelledByText = ref.textContent?.trim() || '';
    }

    const title = el.getAttribute('title') || '';
    const alt = el.getAttribute('alt') || '';
    const text = el.textContent?.trim() || '';

    const name = ariaLabel || labelledByText || title || alt || text;
    return {
      hasName: name.length > 0,
      name,
    };
  }, selector);
}

/**
 * Evaluates whether an element was reached via keyboard Tab navigation.
 */
export function evaluateKeyboardReachability(input: KeyboardReachabilityInput): KeyboardReachabilityResult {
  if (input.matched) {
    return {
      isReachable: true,
      diagnostic: `Target "${input.targetSelector}" reached via keyboard navigation in ${input.tabCount} Tab press(es)`,
    };
  }
  return {
    isReachable: false,
    diagnostic: `Target "${input.targetSelector}" is not keyboard reachable within ${input.maxTabs} Tab presses (activeElement: <${input.finalActiveElement || 'none'}>)`,
  };
}

/**
 * Verifies visible focus indicator by navigating via real keyboard Tab presses.
 * Proves genuine keyboard reachability without calling element.focus() or dispatching synthetic events.
 */
export async function checkVisibleFocus(
  page: Page,
  selector: string,
  options: CheckVisibleFocusOptions = {}
): Promise<FocusIndicatorResult> {
  const maxTabs = options.maxTabs ?? 50;
  const emptyStyles: ElementFocusStyles = {
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: '',
    boxShadow: 'none',
  };

  // 1. Verify element presence and blur/reset focus safely
  const initialCheck = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) {
      return { exists: false, beforeStyles: null };
    }

    // Safely blur any currently focused element to reset tab traversal
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
      (document.activeElement as HTMLElement).blur();
    }
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }

    const s = window.getComputedStyle(el);
    return {
      exists: true,
      beforeStyles: {
        outlineStyle: s.outlineStyle,
        outlineWidth: parseFloat(s.outlineWidth) || 0,
        outlineColor: s.outlineColor,
        boxShadow: s.boxShadow,
      } as ElementFocusStyles,
    };
  }, selector);

  if (!initialCheck.exists || !initialCheck.beforeStyles) {
    return {
      hasVisibleFocus: false,
      outlineChanged: false,
      boxShadowChanged: false,
      diagnostic: `Element not found: ${selector}`,
      before: emptyStyles,
      after: emptyStyles,
    };
  }

  const beforeStyles = initialCheck.beforeStyles;

  // 2. Press Tab through actual keyboard focus order until document.activeElement === target or maxTabs reached
  let reachedTarget = false;
  let tabCount = 0;
  let finalActiveDesc = 'none';

  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    tabCount++;

    const status = await page.evaluate((sel) => {
      const target = document.querySelector(sel);
      const active = document.activeElement;
      const desc = active
        ? `${active.tagName.toLowerCase()}${active.id ? '#' + active.id : ''}${
            active.className && typeof active.className === 'string'
              ? '.' + active.className.trim().split(/\s+/)[0]
              : ''
          }`
        : 'none';

      if (!target) {
        return { isMatch: false, desc, missing: true };
      }
      return {
        isMatch: active === target,
        desc,
        missing: false,
      };
    }, selector);

    finalActiveDesc = status.desc;

    if (status.missing) {
      return {
        hasVisibleFocus: false,
        outlineChanged: false,
        boxShadowChanged: false,
        diagnostic: `Element removed from DOM during Tab navigation: ${selector}`,
        before: beforeStyles,
        after: emptyStyles,
      };
    }

    if (status.isMatch) {
      reachedTarget = true;
      break;
    }
  }

  // 3. Fail with diagnostic if target was not keyboard reachable
  if (!reachedTarget) {
    const reachability = evaluateKeyboardReachability({
      targetSelector: selector,
      matched: false,
      tabCount,
      maxTabs,
      finalActiveElement: finalActiveDesc,
    });

    return {
      hasVisibleFocus: false,
      outlineChanged: false,
      boxShadowChanged: false,
      diagnostic: reachability.diagnostic,
      before: beforeStyles,
      after: beforeStyles,
    };
  }

  // 4. Capture after computed styles when reached via keyboard
  const afterStyles = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const s = window.getComputedStyle(el);
    return {
      outlineStyle: s.outlineStyle,
      outlineWidth: parseFloat(s.outlineWidth) || 0,
      outlineColor: s.outlineColor,
      boxShadow: s.boxShadow,
    } as ElementFocusStyles;
  }, selector);

  if (!afterStyles) {
    return {
      hasVisibleFocus: false,
      outlineChanged: false,
      boxShadowChanged: false,
      diagnostic: `Element lost styles after keyboard focus: ${selector}`,
      before: beforeStyles,
      after: emptyStyles,
    };
  }

  // 5. Evaluate visible focus using existing pure comparison function
  return evaluateFocusIndicator(beforeStyles, afterStyles);
}
