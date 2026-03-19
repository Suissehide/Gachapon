import { createFormHook } from '@tanstack/react-form'
import { Github } from '@uiw/react-color'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { Eye, EyeOff, ImageIcon, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '../components/ui/button.tsx'
import { DatePicker } from '../components/ui/datePicker.tsx'
import { FieldInfo } from '../components/ui/fieldInfo.tsx'
import { Checkbox, Input, Select, TextArea } from '../components/ui/input.tsx'
import { Label } from '../components/ui/label.tsx'
import { TimePicker } from '../components/ui/timePicker.tsx'
import { cn } from '../libs/utils.ts'
import {
  fieldContext,
  formContext,
  useFieldContext,
  useFormContext,
} from './formContext.tsx'

export interface FieldComponentProps {
  label?: string
  disabled?: boolean
  className?: string
}

interface InputFieldProps extends FieldComponentProps {
  type?: string
}

interface SelectFieldProps extends FieldComponentProps {
  options: Array<{ value: string | number; label: string }>
}

interface ToggleFieldProps extends FieldComponentProps {
  options: string[]
}

interface FileFieldProps extends FieldComponentProps {
  accept?: string
}

const TextField = ({ label, type, disabled, className }: InputFieldProps) => {
  const field = useFieldContext<string>()
  const value = field.state.value ?? ''

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <Input
        id={field.name}
        value={value}
        type={type}
        disabled={disabled}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      <FieldInfo field={field} />
    </div>
  )
}

const PasswordField = ({ label, disabled, className }: FieldComponentProps) => {
  const field = useFieldContext<string>()
  const value = field.state.value ?? ''
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <div className="relative">
        <Input
          id={field.name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          disabled={disabled}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text transition-colors"
          aria-label={
            showPassword ? 'Cacher le mot de passe' : 'Afficher le mot de passe'
          }
        >
          {showPassword ? (
            <Eye className="cursor-pointer text-text-light h-4 w-4" />
          ) : (
            <EyeOff className="cursor-pointer text-text-light h-4 w-4" />
          )}
        </button>
      </div>
      <FieldInfo field={field} />
    </div>
  )
}

function SelectField({
  label,
  disabled,
  className,
  options,
}: SelectFieldProps) {
  const field = useFieldContext<string | number>()
  const value = field.state.value ?? ''

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <Select
        id={field.name}
        options={options}
        value={value.toString()}
        disabled={disabled}
        onValueChange={(value) => field.handleChange(value)}
      />
      <FieldInfo field={field} />
    </div>
  )
}

const NumberField = ({ label, className }: FieldComponentProps) => {
  const field = useFieldContext<number | undefined>()
  const value = field.state.value ?? ''

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <Input
        id={field.name}
        type="number"
        value={value}
        onChange={(e) => {
          const val = e.target.value
          field.handleChange(val === '' ? undefined : Number(val))
        }}
        onBlur={field.handleBlur}
      />

      <FieldInfo field={field} />
    </div>
  )
}

function DatePickerField({ label, className }: FieldComponentProps) {
  const field = useFieldContext<string>()
  const value = useMemo(() => {
    const fieldValue = field.state.value
    if (!fieldValue) {
      return null
    }
    return dayjs(fieldValue)
  }, [field.state.value])

  const handleChange = (date: Dayjs | null) => {
    const isoString = date ? date.toISOString() : ''
    field.handleChange(isoString)
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <DatePicker value={value} onChange={handleChange} />
      <FieldInfo field={field} />
    </div>
  )
}

function TimePickerField({ label, className }: FieldComponentProps) {
  const field = useFieldContext<Dayjs | null>()
  const value = field.state.value

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <TimePicker
        value={value}
        onChange={(time: Dayjs | null) => field.handleChange(time ?? dayjs())}
      />
      <FieldInfo field={field} />
    </div>
  )
}

function CheckboxField({ label, className }: FieldComponentProps) {
  const field = useFieldContext<boolean>()
  const value = field.state.value

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <Checkbox
        id={field.name}
        checked={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          field.handleChange(e.target.checked)
        }
        onBlur={field.handleBlur}
      />
      <FieldInfo field={field} />
    </div>
  )
}

function TextAreaField({ label, className }: FieldComponentProps) {
  const field = useFieldContext<string>()
  const value = field.state.value ?? ''

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <TextArea
        id={field.name}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          field.handleChange(e.target.value)
        }
        onBlur={field.handleBlur}
      />
      <FieldInfo field={field} />
    </div>
  )
}

function ColorPickerField({ label, className }: FieldComponentProps) {
  const [open, setOpen] = useState(false)
  const field = useFieldContext<string>()
  const value = field.state.value ?? '#000000'
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (/^#[0-9A-Fa-f]{0,6}$/.test(newValue) || newValue === '') {
      field.handleChange(newValue)
    }
  }

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}

      <div className="relative">
        <div className="flex items-center">
          <button
            type="button"
            className="flex-shrink-0 w-9 h-9 rounded border border-border cursor-pointer rounded-tr-none rounded-br-none"
            style={{ backgroundColor: value }}
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le sélecteur de couleur"
          />

          <Input
            type="text"
            id={field.name}
            value={value}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            placeholder="#000000"
            maxLength={7}
            className="border-l-0 rounded-tl-none rounded-bl-none"
          />
        </div>

        {open && (
          <div className="absolute z-50 mt-2">
            <Github
              className="bg-primary"
              color={value}
              style={{ width: '212px' }}
              onChange={(color: { hex: string }) => {
                field.handleChange(color.hex)
                setOpen(false)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ToggleField({ label, className, options }: ToggleFieldProps) {
  const field = useFieldContext<boolean>()
  const [option1, option2] = options

  const handleToggle = (value: boolean) => {
    field.handleChange(value)
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label htmlFor={field.name}>{label}</Label>}

      <div className="relative w-fit flex items-center border border-border rounded overflow-hidden">
        <div
          className={`absolute inset-y-0 w-1/2 bg-primary rounded transition-transform duration-200 ease-in-out ${
            field.state.value ? 'translate-x-0' : 'translate-x-full'
          }`}
        />

        <button
          type="button"
          onClick={() => handleToggle(true)}
          className={`relative z-10 cursor-pointer px-4 py-2 text-sm rounded transition-colors ${
            field.state.value ? 'text-white' : 'text-text'
          }`}
        >
          {option1}
        </button>

        <button
          type="button"
          onClick={() => handleToggle(false)}
          className={`relative z-10 cursor-pointer px-4 py-2 text-sm transition-colors ${
            field.state.value ? 'text-text' : 'text-white'
          }`}
        >
          {option2}
        </button>
      </div>
    </div>
  )
}

function FileField({
  label,
  className,
  accept = 'image/jpeg,image/png,image/webp',
}: FileFieldProps) {
  const field = useFieldContext<File | null>()
  const file = field.state.value ?? null
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const clear = () => {
    field.handleChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      field.handleChange(dropped)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label>{label}</Label>}
      {preview ? (
        <div className="group relative rounded-md border border-border overflow-hidden bg-black/20">
          <img
            src={preview}
            alt="Aperçu"
            className="w-full object-contain max-h-40"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
            <button
              type="button"
              onClick={clear}
              className="rounded-full bg-destructive/90 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {file && (
            <div className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-2 py-1 text-[10px] text-white/70 opacity-0 transition-opacity group-hover:opacity-100">
              {file.name}
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-input/30 px-4 py-6 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'hover:border-primary/60 hover:bg-primary/5',
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="h-6 w-6 text-text-light/40" />
          <div className="text-center">
            <p className="text-xs font-medium text-text-light">
              Déposer ou <span className="text-primary">parcourir</span>
            </p>
            <p className="mt-0.5 text-[10px] text-text-light/50">
              JPEG · PNG · WEBP
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={(e) => field.handleChange(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </div>
      )}
      <FieldInfo field={field} />
    </div>
  )
}

// Composants de formulaire génériques
function SubmitButton({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  const form = useFormContext()
  return (
    <form.Subscribe
      selector={(state) => ({
        isSubmitting: state.isSubmitting,
        canSubmit: state.canSubmit,
      })}
    >
      {({ isSubmitting, canSubmit }) => (
        <Button type="submit" disabled={isSubmitting || !canSubmit}>
          {children}
          {isSubmitting ? 'Envoi...' : label}
        </Button>
      )}
    </form.Subscribe>
  )
}

// Configuration centralisée avec types
export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    Input: TextField,
    Password: PasswordField,
    Select: SelectField,
    Number: NumberField,
    DatePicker: DatePickerField,
    TimePicker: TimePickerField,
    Checkbox: CheckboxField,
    TextArea: TextAreaField,
    ColorPicker: ColorPickerField,
    Toggle: ToggleField,
    FileInput: FileField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})
