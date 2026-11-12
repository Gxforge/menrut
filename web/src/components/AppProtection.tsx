'use client'

import { useEffect } from 'react'

// MENRUT se comporta como aplicación: sin selección de texto ni menú contextual
// en la portada, en las páginas legales y dentro de la app. Los campos de texto
// (input, textarea, contenteditable) siguen siendo editables y seleccionables.
const EDITABLE = 'input, textarea, select, [contenteditable="true"], [data-allow-select]'

function isEditable(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(EDITABLE)
}

export function AppProtection() {
  useEffect(() => {
    const onContext = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault()
    }
    const onSelect = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault()
    }
    const onDragStart = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault()
    }
    document.addEventListener('contextmenu', onContext)
    document.addEventListener('selectstart', onSelect)
    document.addEventListener('dragstart', onDragStart)
    return () => {
      document.removeEventListener('contextmenu', onContext)
      document.removeEventListener('selectstart', onSelect)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [])
  return null
}
