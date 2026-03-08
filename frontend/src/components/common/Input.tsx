import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  showPasswordToggle?: boolean;
  loading?: boolean;
  required?: boolean;
  counter?: boolean;
  maxLength?: number;
  validate?: (value: string) => string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error: externalError,
  success,
  helper,
  leftIcon,
  rightIcon,
  fullWidth = true,
  showPasswordToggle = false,
  loading = false,
  required = false,
  counter = false,
  maxLength,
  validate,
  className = '',
  id,
  disabled,
  type = 'text',
  value,
  onChange,
  onBlur,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [internalError, setInternalError] = useState<string>();
  const [touched, setTouched] = useState(false);

  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const error = externalError || (touched ? internalError : undefined);
  
  const inputType = showPasswordToggle && type === 'password' 
    ? (showPassword ? 'text' : 'password')
    : type;

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    if (validate && value) {
      const validationError = validate(e.target.value);
      setInternalError(validationError);
    }
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (validate && touched) {
      const validationError = validate(e.target.value);
      setInternalError(validationError);
    }
    onChange?.(e);
  };

  const baseClasses = `
    block rounded-lg shadow-sm transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
    sm:text-sm
  `;

  const widthClass = fullWidth ? 'w-full' : '';

  const stateClasses = error
    ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
    : success
    ? 'border-green-300 text-green-900 focus:border-green-500 focus:ring-green-500'
    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500';

  const withLeftIcon = leftIcon ? 'pl-10' : '';
  const withRightIcon = (rightIcon || showPasswordToggle || loading) ? 'pr-10' : '';

  return (
    <div className={`${widthClass} ${className}`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={`
            ${baseClasses}
            ${widthClass}
            ${stateClasses}
            ${withLeftIcon}
            ${withRightIcon}
            px-3 py-2
          `}
          disabled={disabled || loading}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` 
            : success ? `${inputId}-success`
            : helper ? `${inputId}-helper` 
            : undefined
          }
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={maxLength}
          {...props}
        />
        
        {(rightIcon || showPasswordToggle || loading) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
            ) : showPasswordToggle && type === 'password' ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            ) : (
              rightIcon
            )}
          </div>
        )}
        
        {/* Validation icons */}
        {!loading && !rightIcon && !showPasswordToggle && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {error && <AlertCircle className="h-4 w-4 text-red-500" />}
            {!error && success && touched && <CheckCircle className="h-4 w-4 text-green-500" />}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600" id={`${inputId}-error`}>
          {error}
        </p>
      )}
      
      {/* Success message */}
      {!error && success && (
        <p className="mt-1 text-sm text-green-600" id={`${inputId}-success`}>
          {success}
        </p>
      )}
      
      {/* Helper text and counter */}
      {(helper || (counter && maxLength)) && (
        <div className="flex justify-between mt-1">
          {helper && !error && !success && (
            <p className="text-sm text-gray-500" id={`${inputId}-helper`}>
              {helper}
            </p>
          )}
          {counter && maxLength && value && (
            <p className={`text-sm ${
              String(value).length > maxLength * 0.9 
                ? 'text-orange-500' 
                : 'text-gray-400'
            }`}>
              {String(value).length}/{maxLength}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';