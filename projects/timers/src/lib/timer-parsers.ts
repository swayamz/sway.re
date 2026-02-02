// Timer parsing utilities for different structure types

export function detectAnchoringStructure(input: string): boolean {
  return input.toLowerCase().includes('anchoring until')
}

export interface ParsedTimer {
  structureType: string
  system: string
  location: string
  owner: string
  expiresAt: Date | undefined
  activeUntil?: Date
  layer?: string
}

export function parseOrbitalSkyhook(input: string): ParsedTimer | null {
  try {
    // Expected format:
    // "Orbital Skyhook (F2OY-X IV) [Brave Holdings]
    // 69 km
    // Reinforced until 2025.05.04 20:23:01"
    
    const lines = input.trim().split('\n').map((line: string) => line.trim()).filter((line: string) => line)
    
    if (lines.length < 3) {
      throw new Error('Invalid format: Expected at least 3 lines')
    }

    // Parse first line: "Orbital Skyhook (F2OY-X IV) [Brave Holdings]"
    const firstLine = lines[0]
    const skyhookMatch = firstLine.match(/^Orbital Skyhook \(([^)]+)\) \[([^\]]+)\]$/)
    
    if (!skyhookMatch) {
      throw new Error('Invalid first line format')
    }

    const [, locationPart, owner] = skyhookMatch
    
    // Parse system and planet from location (e.g., "F2OY-X IV")
    const locationMatch = locationPart.match(/^([A-Z0-9\-]+)\s+(.+)$/)
    if (!locationMatch) {
      throw new Error('Invalid location format')
    }

    const [, system, planet] = locationMatch

    // Parse reinforced until line
    let expiresAt: Date | undefined
    for (const line of lines) {
      if (line.startsWith('Reinforced until')) {
        const dateMatch = line.match(/Reinforced until (\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})/)
        if (dateMatch) {
          // Convert EVE format (2025.05.04 20:23:01) to ISO format
          const dateStr = dateMatch[1].replace(/\./g, '-')
          expiresAt = new Date(dateStr + ' UTC')
          break
        }
      }
    }

    if (!expiresAt) {
      throw new Error('Could not parse reinforced until date')
    }

    // Orbital Skyhooks have a 15-minute active window after the timer expires
    const activeUntil = new Date(expiresAt.getTime() + (15 * 60 * 1000))

    return {
      structureType: 'ORBITAL_SKYHOOK',
      system,
      location: planet,
      owner,
      expiresAt,
      activeUntil,
    }
  } catch (error) {
    console.error('Error parsing Orbital Skyhook:', error)
    return null
  }
}

export function parseJumpBridge(input: string, owner: string): ParsedTimer | null {
  try {
    // Expected format:
    // "EFM-C4 » C-J6MT - Eye Of Terror Mk.VIII
    // 1,595 m
    // Reinforced until 2025.08.26 19:16:49"
    
    const lines = input.trim().split('\n').map((line: string) => line.trim()).filter((line: string) => line)
    
    if (lines.length < 3) {
      throw new Error('Invalid format: Expected at least 3 lines')
    }

    // Parse first line: "EFM-C4 » C-J6MT - Eye Of Terror Mk.VIII"
    const firstLine = lines[0]
    const bridgeMatch = firstLine.match(/^([A-Z0-9\-]+)\s+»\s+[A-Z0-9\-]+\s+-\s+(.+)$/)
    
    if (!bridgeMatch) {
      throw new Error('Invalid jump bridge format')
    }

    const [, system, structureName] = bridgeMatch

    // Parse reinforced until line
    let expiresAt: Date | undefined
    for (const line of lines) {
      if (line.startsWith('Reinforced until')) {
        const dateMatch = line.match(/Reinforced until (\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})/)
        if (dateMatch) {
          const dateStr = dateMatch[1].replace(/\./g, '-')
          expiresAt = new Date(dateStr + ' UTC')
          break
        }
      }
    }

    if (!expiresAt) {
      throw new Error('Could not parse reinforced until date')
    }

    // Jump Bridges have a 30-minute active window after the timer expires
    const activeUntil = new Date(expiresAt.getTime() + (30 * 60 * 1000))

    return {
      structureType: 'JUMP_BRIDGE',
      system,
      location: structureName,
      owner,
      expiresAt,
      activeUntil,
    }
  } catch (error) {
    console.error('Error parsing Jump Bridge:', error)
    return null
  }
}

export function parseMercenaryDen(input: string, system: string, planet: string, owner: string): ParsedTimer | null {
  try {
    // Expected format (copy-paste from game):
    // "Mercenary Den
    // 611 m
    // Sec. 5.0
    // Reinforced until 2026.02.02 18:55:15"

    const lines = input.trim().split('\n').map((line: string) => line.trim()).filter((line: string) => line)

    // Parse reinforced until line
    let expiresAt: Date | undefined
    for (const line of lines) {
      if (line.startsWith('Reinforced until')) {
        const dateMatch = line.match(/Reinforced until (\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})/)
        if (dateMatch) {
          const dateStr = dateMatch[1].replace(/\./g, '-')
          expiresAt = new Date(dateStr + ' UTC')
          break
        }
      }
    }

    if (!expiresAt) {
      throw new Error('Could not parse reinforced until date')
    }

    // Mercenary Dens have a 30-minute active window after the timer expires
    const activeUntil = new Date(expiresAt.getTime() + (30 * 60 * 1000))

    return {
      structureType: 'MERCENARY_DEN',
      system,
      location: planet,
      owner,
      expiresAt,
      activeUntil,
    }
  } catch (error) {
    console.error('Error parsing Mercenary Den:', error)
    return null
  }
}

export function parseAnchoringStructure(input: string, structureType: string, owner: string): ParsedTimer | null {
  try {
    // Expected format:
    // "B-WQDP - Nervous Energy
    // 2,398 km
    // Anchoring until 2025.09.22 16:49:02"

    const lines = input.trim().split('\n').map((line: string) => line.trim()).filter((line: string) => line)

    if (lines.length < 3) {
      throw new Error('Invalid format: Expected at least 3 lines')
    }

    // Parse first line: "B-WQDP - Nervous Energy"
    const firstLine = lines[0]
    const structureMatch = firstLine.match(/^([A-Za-z0-9\-]+)\s+-\s+(.+)$/)

    if (!structureMatch) {
      throw new Error('Invalid structure format')
    }

    const [, system, structureName] = structureMatch

    // Parse anchoring until line
    let expiresAt: Date | undefined
    for (const line of lines) {
      if (line.startsWith('Anchoring until')) {
        const dateMatch = line.match(/Anchoring until (\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})/)
        if (dateMatch) {
          const dateStr = dateMatch[1].replace(/\./g, '-')
          expiresAt = new Date(dateStr + ' UTC')
          break
        }
      }
    }

    if (!expiresAt) {
      throw new Error('Could not parse anchoring until date')
    }

    // Anchoring structures have a 15-minute active window after the timer expires
    const activeUntil = new Date(expiresAt.getTime() + (15 * 60 * 1000))

    return {
      structureType,
      system,
      location: structureName,
      owner,
      expiresAt,
      activeUntil,
      layer: 'ANCHORING',
    }
  } catch (error) {
    console.error('Error parsing anchoring structure:', error)
    return null
  }
}

export function parseOtherStructure(
  input: string,
  structureType: string,
  layer: string,
  owner: string
): ParsedTimer | null {
  try {
    // Expected format:
    // "Y-MPWL - Road of Military Parade S
    // 3,714 km
    // Reinforced until 2025.08.24 19:25:45"
    
    const lines = input.trim().split('\n').map((line: string) => line.trim()).filter((line: string) => line)
    
    if (lines.length < 3) {
      throw new Error('Invalid format: Expected at least 3 lines')
    }

    // Parse first line: "Y-MPWL - Road of Military Parade S" or "Ruvas - GH's MTU Reprocessing Facility"
    const firstLine = lines[0]
    const structureMatch = firstLine.match(/^([A-Za-z0-9\-]+)\s+-\s+(.+)$/)
    
    if (!structureMatch) {
      throw new Error('Invalid structure format')
    }

    const [, system, structureName] = structureMatch

    // Parse reinforced until line
    let expiresAt: Date | undefined
    for (const line of lines) {
      if (line.startsWith('Reinforced until')) {
        const dateMatch = line.match(/Reinforced until (\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})/)
        if (dateMatch) {
          const dateStr = dateMatch[1].replace(/\./g, '-')
          expiresAt = new Date(dateStr + ' UTC')
          break
        }
      }
    }

    if (!expiresAt) {
      throw new Error('Could not parse reinforced until date')
    }

    // Calculate active window based on layer
    // HULL layer has 30-minute window, others have 15-minute window
    let repairWindowMinutes = 15
    if (layer === 'HULL') {
      repairWindowMinutes = 30
    }
    
    const activeUntil = new Date(expiresAt.getTime() + (repairWindowMinutes * 60 * 1000))

    return {
      structureType,
      system,
      location: structureName,
      owner,
      expiresAt,
      activeUntil,
      layer,
    }
  } catch (error) {
    console.error('Error parsing structure:', error)
    return null
  }
}