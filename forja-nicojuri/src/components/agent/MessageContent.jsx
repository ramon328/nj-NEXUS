// Renderiza el contenido de un mensaje de Forjita como Markdown ligero
// (sin dependencias): **negrita**, *cursiva*, `código`, listas con viñeta o
// numeradas, y subtítulos con ###.

// ─── Markdown en línea: **negrita**, *cursiva*, `código` ──────────────────────
function inline(text, keyBase) {
  const nodes = []
  // Tokeniza por los tres patrones, conservando el resto como texto plano.
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g
  let last = 0, m, k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[2] != null) nodes.push(<strong key={`${keyBase}-b${k}`}>{m[2]}</strong>)
    else if (m[3] != null) nodes.push(<em key={`${keyBase}-i${k}`}>{m[3]}</em>)
    else if (m[4] != null) nodes.push(<code key={`${keyBase}-c${k}`} className="fj-code">{m[4]}</code>)
    last = m.index + m[0].length
    k++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

// Convierte el texto en bloques: párrafos, listas y subtítulos.
function renderText(text, keyBase) {
  const lines = text.replace(/\n{3,}/g, '\n\n').split('\n')
  const blocks = []
  let list = null // { ordered, items: [] }

  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag key={`${keyBase}-l${blocks.length}`} className="fj-list">
        {list.items.map((li, i) => <li key={i}>{inline(li, `${keyBase}-li${blocks.length}-${i}`)}</li>)}
      </Tag>
    )
    list = null
  }

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const heading = line.match(/^#{1,4}\s+(.*)$/)

    if (heading) {
      flush()
      blocks.push(<p key={`${keyBase}-h${i}`} className="fj-msg-h">{inline(heading[1], `${keyBase}-h${i}`)}</p>)
    } else if (bullet) {
      if (!list || list.ordered) { flush(); list = { ordered: false, items: [] } }
      list.items.push(bullet[1])
    } else if (numbered) {
      if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] } }
      list.items.push(numbered[1])
    } else if (line.trim() === '') {
      flush()
    } else {
      flush()
      blocks.push(<p key={`${keyBase}-p${i}`}>{inline(line, `${keyBase}-p${i}`)}</p>)
    }
  })
  flush()
  return blocks
}

export default function MessageContent({ text }) {
  return <div className="fj-text">{renderText(text ?? '', 's0')}</div>
}
