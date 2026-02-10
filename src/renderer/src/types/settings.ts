import type { ModelAlias } from './claude'

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  codeFontSize: 'small' | 'medium' | 'large'
}

export interface ChatSettings {
  sendOnEnter: boolean
  showTimestamps: 'hover' | 'always' | 'never'
  maxContentWidth: 'narrow' | 'medium' | 'wide'
}

export interface ModelSettings {
  default: ModelAlias
  systemPrompt: string
}

export interface AppSettings {
  appearance: AppearanceSettings
  chat: ChatSettings
  model: ModelSettings
}

export const SETTINGS_VERSION = 1

export const DEFAULT_SETTINGS: AppSettings = {
  appearance: {
    theme: 'system',
    fontSize: 'medium',
    codeFontSize: 'medium'
  },
  chat: {
    sendOnEnter: true,
    showTimestamps: 'hover',
    maxContentWidth: 'medium'
  },
  model: {
    default: 'sonnet',
    systemPrompt: ''
  }
}

export type SettingsSection = keyof AppSettings
