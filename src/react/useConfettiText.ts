// confettiText/src/react/useConfettiText.ts — React binding for the confetti burst.
// Returns a ref to attach to the source element plus an imperative `fire()`. By default the element
// bursts its own text on click; `trigger` switches to fire-on-mount, fire-on-scroll-into-view, or
// manual (call `fire()` yourself).
import { useCallback, useEffect, useRef } from 'react'
import { burstFromElement, confettiText, type ConfettiBurst } from '../core/adjust'
import { makeKeyboardOperable } from '../core/a11y'
import type { ConfettiTextOptions, ReactConfettiTextOptions } from '../core/types'

/** What `useConfettiText` returns. */
export interface ConfettiTextHandle {
	/** Attach to the element whose text should burst (and, for the `click` trigger, be clickable). */
	ref: React.RefObject<HTMLElement | null>
	/**
	 * Fire a burst imperatively from the element's position (or viewport centre if unattached).
	 * Returns the {@link ConfettiBurst} (awaitable; `.clear()` cancels just this burst).
	 */
	fire: (overrides?: ConfettiTextOptions) => ConfettiBurst
}

/** Elements that already fired their `mount` burst (StrictMode mounts effects twice in development). */
const firedOnMount = new WeakSet<HTMLElement>()

/**
 * React hook wrapping {@link confettiText}. The burst originates from the ref'd element and, unless
 * `text` is given, is made of that element's visible text. Respects `prefers-reduced-motion` via the core.
 * For the default `click` trigger the ref'd element is made keyboard-operable (see the core's
 * makeKeyboardOperable: generic elements become buttons, headings keep their role). The wiring follows
 * the ref: an element that appears later, or a different element (e.g. a changed `as`), is wired too.
 *
 * @param options - burst options plus a React-only `trigger` ('click' | 'mount' | 'inView' | 'manual')
 */
export function useConfettiText(options: ReactConfettiTextOptions = {}): ConfettiTextHandle {
	const ref = useRef<HTMLElement | null>(null)
	const optionsRef = useRef(options)
	optionsRef.current = options

	const fire = useCallback((overrides: ConfettiTextOptions = {}): ConfettiBurst => {
		const { trigger: _trigger, ...opts } = { ...optionsRef.current, ...overrides } as ReactConfettiTextOptions
		const el = ref.current
		if (el && typeof window !== 'undefined') return burstFromElement(el, opts)
		return confettiText(opts)
	}, [])

	const trigger = options.trigger ?? 'click'
	const wired = useRef<{ el: HTMLElement; trigger: string; cleanup: () => void } | null>(null)

	// Every render: (re)wire when the element or the trigger changed.
	useEffect(() => {
		const el = ref.current
		const current = wired.current
		if (current && current.el === el && current.trigger === trigger) return
		current?.cleanup()
		wired.current = null
		if (!el) return

		let cleanup = () => {}
		if (trigger === 'mount') {
			if (!firedOnMount.has(el)) {
				firedOnMount.add(el)
				fire()
			}
		} else if (trigger === 'inView') {
			if (typeof IntersectionObserver === 'undefined') {
				fire()
			} else {
				const io = new IntersectionObserver(
					(entries) => {
						if (entries[0].isIntersecting) {
							fire()
							io.disconnect()
						}
					},
					{ threshold: 0.4 },
				)
				io.observe(el)
				cleanup = () => io.disconnect()
			}
		} else if (trigger === 'click') {
			// Plus keyboard operability for non-interactive elements (WCAG 2.1.1).
			const onClick = (): void => { fire() }
			el.addEventListener('click', onClick)
			const undoKeyboard = makeKeyboardOperable(el, () => { fire() })
			cleanup = () => {
				el.removeEventListener('click', onClick)
				undoKeyboard()
			}
		}
		wired.current = { el, trigger, cleanup }
	})

	// Unwire on unmount.
	useEffect(() => () => {
		wired.current?.cleanup()
		wired.current = null
	}, [])

	return { ref, fire }
}
