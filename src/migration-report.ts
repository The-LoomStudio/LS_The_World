import { createLegacyWorldImport, type LegacyWorldImport, type LegacyWorldImportResult } from './importer.js'
import { MigrationParseError } from './migration-parser.js'

export type MigrationReport = {
  status: 'ready' | 'warning' | 'error'
  operationCount: number
  warnings: number
  errors: number
  diagnostics: LegacyWorldImportResult['diagnostics']
  result?: LegacyWorldImportResult
}

export function inspectLegacyWorldImport(input: LegacyWorldImport): MigrationReport {
  try {
    const result = createLegacyWorldImport(input)
    const warnings = result.diagnostics.filter(item => item.severity === 'warning').length
    const errors = result.diagnostics.filter(item => item.severity === 'error').length
    return { status: errors ? 'error' : warnings ? 'warning' : 'ready', operationCount: result.operations.length, warnings, errors, diagnostics: result.diagnostics, result }
  } catch (error) {
    const diagnostic = error instanceof MigrationParseError
      ? error.diagnostics
      : [{ severity: 'error' as const, code: 'migration-failed', message: error instanceof Error ? error.message : String(error) }]
    return { status: 'error', operationCount: 0, warnings: diagnostic.filter(item => item.severity === 'warning').length, errors: diagnostic.filter(item => item.severity === 'error').length, diagnostics: diagnostic }
  }
}
