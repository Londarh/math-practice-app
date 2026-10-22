import type { ComponentPropsWithRef, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import './Button.css'

export type ButtonVariant = 'primary' | 'success' | 'purple' | 'secondary'
export type ButtonSize = 'md' | 'lg'

interface ButtonStyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Decorative icon shown before the label; hidden from screen readers. */
  icon?: ReactNode
  children: ReactNode
}

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  extra?: string,
) {
  return ['button', `button--${variant}`, `button--${size}`, extra]
    .filter(Boolean)
    .join(' ')
}

function ButtonContent({
  icon,
  children,
}: Pick<ButtonStyleProps, 'icon' | 'children'>) {
  return (
    <>
      {icon && (
        <span className="button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </>
  )
}

type ButtonProps = ButtonStyleProps &
  Omit<ComponentPropsWithRef<'button'>, 'children'>

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, size, className)}
      {...rest}
    >
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </button>
  )
}

type ButtonLinkProps = ButtonStyleProps & Omit<LinkProps, 'children'>

/** A link styled as a button, for actions that navigate to another page. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName(variant, size, className)} {...rest}>
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </Link>
  )
}
