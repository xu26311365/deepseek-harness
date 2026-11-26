/** Verify runtime bytes and executable permissions using ASAR records and physical unpacked files. */
import { createHash } from 'node:crypto'
import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { readAsar, type Node } from 'app-builder-lib/out/asar/asar.js'
import type { DesktopRuntimeDescriptor, DesktopRuntimeFile } from '../src/runtime-tree.ts'

/**
 * Compare the complete archived dsh tree with the sealed preparation inventory.
 * @param archivePath - Application ASAR file beside its unpacked directory.
 * @param expected - Verified preparation descriptor, including its complete file inventory.
 * @returns Resolves when bytes, file membership and meaningful executable permissions match.
 */
export async function verifyRuntimeArchive(archivePath: string, expected: DesktopRuntimeDescriptor): Promise<void> {
  const archive = await readAsar(archivePath)
  const descriptor = await archive.readFile(join('dsh', 'desktop-runtime.json'))
  if (!descriptor.equals(Buffer.from(`${JSON.stringify(expected, undefined, 2)}\n`))) {
    throw new Error('desktop runtime: archived descriptor differs from preparation')
  }
  const files: DesktopRuntimeFile[] = []
  const unpacked = new Set<string>()
  async function visit(node: Node, path: string): Promise<void> {
    if (node.link !== undefined) throw new Error(`desktop runtime: unexpected ASAR link ${path}`)
    if (node.files !== undefined) {
      for (const [name, child] of Object.entries(node.files)) await visit(child, path === '' ? name : `${path}/${name}`)
      return
    }
    const name = join('dsh', ...path.split('/'))
    const physical = node.unpacked === true ? await lstat(join(`${archivePath}.unpacked`, name)) : undefined
    if (physical !== undefined && !physical.isFile()) throw new Error(`desktop runtime: unexpected unpacked entry ${path}`)
    if (node.unpacked === true) unpacked.add(join(`${archivePath}.unpacked`, name))
    if (path === 'desktop-runtime.json') return
    const body = await archive.readFile(name)
    // ASAR stores only owner-execute; group/other-only executable files fail the inventory comparison.
    const executable = process.platform !== 'win32' && (physical !== undefined
      ? (physical.mode & 0o111) !== 0
      : node.executable === true)
    files.push({ path, bytes: body.byteLength, sha256: createHash('sha256').update(body).digest('hex'), executable })
  }
  await visit(archive.getFile('dsh', false), '')
  const entries = await readdir(join(`${archivePath}.unpacked`, 'dsh'), { recursive: true, withFileTypes: true })
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT' && unpacked.size === 0) return []
      throw error
    })
  for (const entry of entries) {
    if (entry.isDirectory()) continue
    const path = join(entry.parentPath, entry.name)
    if (!entry.isFile() || !unpacked.has(path)) throw new Error(`desktop runtime: unexpected unpacked entry ${path}`)
  }
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  if (JSON.stringify(files) !== JSON.stringify(expected.files)) {
    const expectedByPath = new Map(expected.files.map(file => [file.path, file]))
    const actualByPath = new Map(files.map(file => [file.path, file]))
    const missing = expected.files.filter(file => !actualByPath.has(file.path))
    const extra = files.filter(file => !expectedByPath.has(file.path))
    const changed = files.filter(file => {
      const sealed = expectedByPath.get(file.path)
      return sealed !== undefined && (sealed.sha256 !== file.sha256 || sealed.bytes !== file.bytes)
    })
    console.error(`desktop runtime: ASAR inventory diff sealed=${expected.files.length} archived=${files.length}`
      + ` missing=${missing.length} extra=${extra.length} changed=${changed.length}`)
    for (const file of missing.slice(0, 80)) console.error(`  missing: ${file.path} bytes=${file.bytes} sha=${file.sha256}`)
    for (const file of extra.slice(0, 80)) console.error(`  extra: ${file.path} bytes=${file.bytes} sha=${file.sha256}`)
    for (const file of changed.slice(0, 80)) {
      const sealed = expectedByPath.get(file.path)!
      console.error(`  changed: ${file.path} sealed=${sealed.bytes}/${sealed.sha256} archived=${file.bytes}/${file.sha256}`)
    }
    throw new Error('desktop runtime: ASAR integrity verification failed')
  }
}
