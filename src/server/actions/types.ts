export interface FormState {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: Record<string, string[]>
  /** Small payload a form may need after success (e.g. the created id). */
  data?: Record<string, string>
}

export const idleFormState: FormState = { status: 'idle' }
