// MENRUT — Compresión de imágenes en el cliente (ahorro de datos)
// Método compartido por TODAS las subidas de imagen de la app:
//   1. Redimensiona al lado máximo indicado (px).
//   2. Convierte a WebP (formato ligero, soportado en todos los navegadores
//      modernos de Android/iOS).
//   3. Baja la calidad de forma iterativa hasta quedar por debajo del peso
//      objetivo en KB (nunca por debajo de la calidad mínima).
// Una captura de 3-5 MB queda en ~100-200 KB: menos datos móviles del
// usuario, menos ancho de banda y menos almacenamiento en Supabase Storage.
// Si el archivo ya cumple (WebP y dentro del peso), se devuelve tal cual.

export interface CompressImageOptions {
  /** Lado máximo en píxeles (por defecto 1280). */
  maxSide?: number
  /** Calidad inicial de WebP 0-1 (por defecto 0.85). */
  quality?: number
  /** Calidad mínima aceptable 0-1 (por defecto 0.55). */
  minQuality?: number
  /** Peso objetivo en KB (por defecto 200). */
  targetKb?: number
  /** Nombre base del archivo de salida (por defecto «imagen»). */
  fileName?: string
}

const DEFAULTS: Required<CompressImageOptions> = {
  maxSide: 1280,
  quality: 0.85,
  minQuality: 0.55,
  targetKb: 200,
  fileName: 'imagen',
}

function toWebpFile(blob: Blob, fileName: string): File {
  return new File([blob], `${fileName}.webp`, { type: 'image/webp' })
}

/**
 * Comprime una imagen del usuario a WebP ligero.
 * Devuelve SIEMPRE un File WebP (o el original si ya cumple de sobra).
 */
export async function compressImage(
  file: File,
  opts: CompressImageOptions = {},
): Promise<File> {
  const { maxSide, quality, minQuality, targetKb, fileName } = { ...DEFAULTS, ...opts }

  if (file.type === 'image/webp' && file.size <= targetKb * 1024) {
    return file // ya es ligero: no tocar
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('No se pudo procesar la imagen en este dispositivo.')
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  // Itera bajando calidad hasta quedar por debajo del peso objetivo.
  let q = quality
  let blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', q),
  )
  if (!blob) {
    throw new Error('El formato de la imagen no es compatible. Prueba con JPG o PNG.')
  }
  while (blob.size > targetKb * 1024 && q > minQuality) {
    q = Math.max(minQuality, q - 0.1)
    const next = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', q),
    )
    if (!next) break
    blob = next
  }

  return toWebpFile(blob, fileName)
}

/** Peso legible para mostrar al usuario (p. ej. «1.8 MB»). */
export function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
