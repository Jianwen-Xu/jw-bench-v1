// 15-component mini-manifest — JSX TypeScript interfaces
// Rules: no className, no style prop, no anonymous functions, token-driven only

export interface ColumnProps { children?: React.ReactNode }
export interface RowProps { children?: React.ReactNode }

export interface CardProps { children?: React.ReactNode }

export interface FormProps {
  onSubmit?: string;           // named action only
  children?: React.ReactNode;
}

export interface TextProps {
  variant?: 'title' | 'heading' | 'body' | 'price' | 'section-title' | 'caption';
  bind?: string;               // state ref
  children?: string;
}

export interface ImageProps {
  size?: 'small' | 'medium' | 'large';
  src?: string;                // token or state ref
  shape?: 'square' | 'circle';
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  onTap?: string;              // named action
  disabled?: boolean;
  children?: string;
}

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  bind?: string;               // state ref
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export interface SelectProps {
  bind?: string;
  options?: string;            // state ref to options array
  required?: boolean;
  disabled?: boolean;
}

export interface CheckboxProps {
  bind?: string;
  disabled?: boolean;
  children?: string;           // label text
}

export interface ToggleProps {
  bind?: string;
  disabled?: boolean;
  label?: string;
}

export interface LinkProps {
  onTap?: string;
  variant?: 'default' | 'subtle';
  children?: string;
}

export interface NavBarProps {
  title?: string;
  onBack?: string;
  actions?: string;            // state ref
}

export interface BadgeProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  bind?: string;
  children?: string;
}

export interface ToastProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  bind?: string;               // show condition
  message?: string;
  duration?: number;
}

export interface AvatarProps {
  size?: 'small' | 'medium' | 'large';
  shape?: 'circle' | 'square';
  src?: string;
}
