import { getSystemRegion } from './esi'
import crypto from 'crypto'

export interface ParsedEntosisNotification {
  system: string
  timestamp: Date
  isReinforced: boolean
  notificationHash: string
}

export interface EntosisImportResult {
  parsed: ParsedEntosisNotification[]
  errors: string[]
  duplicatesSkipped: number
}

export function parseEntosisNotifications(mailText: string): EntosisImportResult {
  const lines = mailText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  const parsed: ParsedEntosisNotification[] = []
  const errors: string[] = []
  let duplicatesSkipped = 0

  const seenHashes = new Set<string>()

  // Calculate 12 hours ago in UTC
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)

  for (const line of lines) {
    try {
      const notification = parseEntosisLine(line)
      if (notification) {
        // Filter out notifications older than 12 hours (UTC)
        if (notification.timestamp < twelveHoursAgo) {
          continue
        }

        // Check for duplicates within this import
        if (seenHashes.has(notification.notificationHash)) {
          duplicatesSkipped++
          continue
        }
        seenHashes.add(notification.notificationHash)
        parsed.push(notification)
      }
    } catch (error) {
      errors.push(`Failed to parse line: "${line}" - ${error}`)
    }
  }

  return {
    parsed,
    errors,
    duplicatesSkipped
  }
}

function parseEntosisLine(line: string): ParsedEntosisNotification | null {
  // Example format:
  // "Pandemic Horde Inc.	Sovereignty Hub in UJXC-B is being captured	2025.10.03 00:01"

  const beingCapturedMatch = line.match(/Sovereignty Hub in ([A-Z0-9-]+) is being captured\s+(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2})/)

  if (!beingCapturedMatch) {
    return null // Line doesn't match expected format
  }

  const system = beingCapturedMatch[1]
  const timestampStr = beingCapturedMatch[2]
  const isReinforced = false

  // Parse timestamp (format: "2025.10.03 00:01")
  const timestamp = parseEveTimestamp(timestampStr)
  if (!timestamp) {
    throw new Error(`Invalid timestamp format: ${timestampStr}`)
  }

  // Create unique hash for deduplication
  const notificationHash = createNotificationHash(system, timestamp, isReinforced)

  return {
    system,
    timestamp,
    isReinforced,
    notificationHash
  }
}

function parseEveTimestamp(timestampStr: string): Date | null {
  // Format: "2025.10.03 00:01"
  const match = timestampStr.match(/^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})$/)
  if (!match) return null

  const [, year, month, day, hour, minute] = match
  // EVE Online uses UTC time, so parse as UTC
  return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)))
}

function createNotificationHash(system: string, timestamp: Date, isReinforced: boolean): string {
  const hashInput = `${system}-${timestamp.toISOString()}-${isReinforced}`
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16)
}

export async function enrichWithRegion(notifications: ParsedEntosisNotification[]): Promise<ParsedEntosisNotification[]> {
  const enriched = []

  for (const notification of notifications) {
    try {
      const region = await getSystemRegion(notification.system)
      enriched.push({
        ...notification,
        region
      })
    } catch (error) {
      console.error(`Failed to get region for system ${notification.system}:`, error)
      enriched.push({
        ...notification,
        region: null
      })
    }
  }

  return enriched
}