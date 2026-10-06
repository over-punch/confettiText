// confettiText/src/react/ConfettiText.tsx — drop-in component that bursts its children into confetti.
import React, { forwardRef, useCallback } from 'react'
import { useConfettiText } from './useConfettiText'
import type { ReactConfettiTextOptions } from '../core/types'

interface ConfettiTextProps extends ReactConfettiTextOptions, Omit<React.AllHTMLAttributes<HTMLElement>, 'children' | 'className' | 'style' | 'as'> {
	children: React.ReactNode
	className?: string
	style?: React.CSSProperties
	/** Element to render (default: 'span'). Use 'button' for the most accessible click target. */
	as?: React.ElementType
}

/** ReactConfettiTextOptions keys: consumed by the hook, not forwarded to the DOM element. */
const OPTION_KEYS: (keyof ReactConfettiTextOptions)[] = [
	'text', 'symbols', 'shapes', 'particleCount', 'angle', 'spread', 'startVelocity', 'decay', 'gravity', 'drift',
	'ticks', 'scalar', 'origin', 'colors', 'weightRange', 'fontFamily', 'flat', 'zIndex', 'disableForReducedMotion', 'trigger',
]

/**
 * Renders its children as the confetti source text. With the default `trigger="click"`, clicking the
 * element bursts its letters from its on-screen position. Use `trigger="mount" | "inView" | "manual"`
 * for other timings; for `manual`, drive it with the {@link useConfettiText} hook instead. HTML
 * attributes and handlers (id, aria-*, data-*, lang, onClick, href…) are forwarded to the element.
 *
 * @example <ConfettiText as="button" particleCount={120}>Congrats!</ConfettiText>
 */
export const ConfettiText = forwardRef<HTMLElement, ConfettiTextProps>(function ConfettiText(
	{ children, className, style, as: Tag = 'span', ...rest },
	forwardedRef,
) {
	const options: ReactConfettiTextOptions = {}
	const htmlProps: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(rest)) {
		if ((OPTION_KEYS as string[]).includes(key)) (options as Record<string, unknown>)[key] = value
		else htmlProps[key] = value
	}
	const { ref } = useConfettiText(options)

	// Merge the hook's ref with any forwarded ref so both are satisfied.
	const mergedRef = useCallback(
		(node: HTMLElement | null) => {
			ref.current = node
			if (typeof forwardedRef === 'function') {
				forwardedRef(node)
			} else if (forwardedRef) {
				forwardedRef.current = node
			}
		},
		[ref, forwardedRef],
	)

	return (
		<Tag
			ref={mergedRef as React.Ref<HTMLElement>}
			className={className}
			style={{ cursor: (options.trigger ?? 'click') === 'click' ? 'pointer' : undefined, ...style }}
			{...htmlProps}
		>
			{children}
		</Tag>
	)
})

ConfettiText.displayName = 'ConfettiText'
