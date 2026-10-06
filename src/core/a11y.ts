// confettiText/src/core/a11y.ts — shared keyboard-operability shim for click-to-burst triggers.
// Used by both attachConfettiText (core) and the React click effect so the behavior lives in one place.

/** Tags that are focusable and fire `click` on Enter/Space natively — no keyboard shim needed. */
export const NATIVE_INTERACTIVE = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'])

/** Elements with no implicit role of their own: giving them role="button" takes nothing away. */
const GENERIC = new Set(['DIV', 'SPAN', 'B', 'I', 'EM', 'STRONG', 'SMALL', 'MARK', 'U', 'S', 'SUB', 'SUP', 'CODE', 'KBD', 'SAMP', 'VAR', 'FONT', 'A'])

/** Interactive content inside an element (its own controls must keep their keyboard behaviour). */
const INTERACTIVE_CONTENT = 'a[href], button, input, select, textarea, summary, [contenteditable=""], [contenteditable="true"], [tabindex]:not([tabindex="-1"])'

/** How many shims are active on each element, and which attributes they added (removed with the last one). */
const shimState = new WeakMap<HTMLElement, { count: number; addedTabIndex: boolean; addedRole: boolean }>()

/** Whether an element handles Enter/Space itself (a link only when it has an href). */
function isNativelyInteractive(el: HTMLElement): boolean {
	if (el.tagName === 'A') return el.hasAttribute('href')
	return NATIVE_INTERACTIVE.has(el.tagName)
}

/**
 * Make a non-natively-interactive element keyboard-operable: Enter/Space on the focused element calls
 * `activate`, and the element becomes focusable (`tabindex="0"`) when it has no tabindex.
 *
 * - Generic elements (`div`, `span`…) also get `role="button"`. Semantic elements (headings, paragraphs,
 *   list items…) keep their own role, so a heading stays a heading.
 * - Elements that contain their own controls (links, buttons, inputs, editable text) get no shim at all:
 *   clicking still works, and their controls keep their own keyboard behaviour (a role="button" container
 *   would also nest interactive content). Use a real `<button>` (or `as="button"`) for keyboard access.
 * - Only keys aimed at the element itself count — never a key typed into something inside it, a held-down
 *   repeat, or a Ctrl/Cmd/Alt chord.
 *
 * Returns a cleanup function; attributes this call added are removed when the last shim on the element is
 * cleaned up, and only if they still hold the values the shim set.
 */
export function makeKeyboardOperable(el: HTMLElement, activate: () => void): () => void {
	// Editable text needs its own Enter/Space.
	if (!el || isNativelyInteractive(el) || el.isContentEditable) return () => {}
	if (el.querySelector(INTERACTIVE_CONTENT)) return () => {}

	const onKey = (e: KeyboardEvent): void => {
		if (e.target !== el || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			e.preventDefault()
			activate()
		}
	}
	el.addEventListener('keydown', onKey)

	let state = shimState.get(el)
	if (!state) {
		state = { count: 0, addedTabIndex: false, addedRole: false }
		if (!el.hasAttribute('tabindex')) {
			el.tabIndex = 0
			state.addedTabIndex = true
		}
		if (!el.hasAttribute('role') && GENERIC.has(el.tagName)) {
			el.setAttribute('role', 'button')
			state.addedRole = true
		}
		shimState.set(el, state)
	}
	state.count++

	let done = false
	return () => {
		if (done) return
		done = true
		el.removeEventListener('keydown', onKey)
		const s = shimState.get(el)
		if (!s || --s.count > 0) return
		if (s.addedTabIndex && el.getAttribute('tabindex') === '0') el.removeAttribute('tabindex')
		if (s.addedRole && el.getAttribute('role') === 'button') el.removeAttribute('role')
		shimState.delete(el)
	}
}
