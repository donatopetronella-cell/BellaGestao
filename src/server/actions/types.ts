export interface FormState {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: Record<string, string[]>
}

export const idleFormState: FormState = { status: 'idle' }
