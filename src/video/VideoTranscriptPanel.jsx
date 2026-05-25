import { useState, useRef } from 'react'
import { useVideoStore } from '../store/videoStore'

// ── Mock transcript data ──────────────────────────────────────────────────────
const TRANSCRIPT = [
  { id: 'w-0',  t: 0.0,  end: 0.5,  word: 'Welcome'    },
  { id: 'w-1',  t: 0.5,  end: 0.9,  word: 'to'         },
  { id: 'w-2',  t: 0.9,  end: 1.5,  word: 'ZaraForge,' },
  { id: 'w-3',  t: 1.5,  end: 1.9,  word: 'the'        },
  { id: 'w-4',  t: 1.9,  end: 2.6,  word: 'ultimate'   },
  { id: 'w-5',  t: 2.6,  end: 3.3,  word: 'creative'   },
  { id: 'w-6',  t: 3.3,  end: 3.9,  word: 'platform.'  },
  { id: 'w-7',  t: 4.4,  end: 4.8,  word: 'Today'      },
  { id: 'w-8',  t: 4.8,  end: 5.1,  word: 'we'         },
  { id: 'w-9',  t: 5.1,  end: 5.5,  word: 'explore'    },
  { id: 'w-10', t: 5.5,  end: 6.2,  word: 'advanced'   },
  { id: 'w-11', t: 6.2,  end: 6.9,  word: 'motion'     },
  { id: 'w-12', t: 6.9,  end: 7.7,  word: 'compositing'},
  { id: 'w-13', t: 7.7,  end: 8.2,  word: 'techniques.'},
  { id: 'w-14', t: 8.8,  end: 9.2,  word: 'Our'        },
  { id: 'w-15', t: 9.2,  end: 9.7,  word: 'AI-powered' },
  { id: 'w-16', t: 9.7,  end: 10.3, word: 'pipeline'   },
  { id: 'w-17', t: 10.3, end: 10.9, word: 'handles'    },
  { id: 'w-18', t: 10.9, end: 11.5, word: 'everything' },
  { id: 'w-19', t: 11.5, end: 12.1, word: 'automatically.'},
  { id: 'w-20', t: 12.8, end: 13.3, word: 'From'       },
  { id: 'w-21', t: 13.3, end: 13.9, word: 'color'      },
  { id: 'w-22', t: 13.9, end: 14.5, word: 'grading'    },
  { id: 'w-23', t: 14.5, end: 15.0, word: 'to'         },
  { id: 'w-24', t: 15.0, end: 15.8, word: 'keyframe'   },
  { id: 'w-25', t: 15.8, end: 16.6, word: 'animation,' },
  { id: 'w-26', t: 16.6, end: 17.2, word: 'every'      },
  { id: 'w-27', t: 17.2, end: 17.7, word: 'detail'     },
  { id: 'w-28', t: 17.7, end: 18.3, word: 'is'         },
  { id: 'w-29', t: 18.3, end: 19.0, word: 'covered.'   },
  { id: 'w-30', t: 19.7, end: 20.1, word: 'Let\'s'     },
  { id: 'w-31', t: 20.1, end: 20.6, word: 'build'      },
  { id: 'w-32', t: 20.6, end: 21.1, word: 'something'  },
  { id: 'w-33', t: 21.1, end: 22.0, word: 'incredible' },
  { id: 'w-34', t: 22.0, end: 22.5, word: 'together.'  },
]

// Group words into paragraph chunks by silence gaps > 0.6s
function buildParagraphs(words) {
  const paras = []
  let current = []
  for (let i = 0; i < words.length; i++) {
    current.push(words[i])
    const gap = i + 1 < words.length ? words[i + 1].t - words[i].end : Infinity
    if (gap > 0.6) {
      paras.push(current)
      current = []
    }
  }
  if (current.length) paras.push(current)
  return paras
}

const PARAGRAPHS = buildParagraphs(TRANSCRIPT)

export default function VideoTranscriptPanel() {
  const { currentTime, seek, rippleDelete } = useVideoStore()
  const [selection, setSelection]   = useState(null) // { startId, endId }
  const [dragStart, setDragStart]   = useState(null)
  const [deletedIds, setDeletedIds] = useState(new Set())
  const [flash, setFlash]           = useState(false)

  // Compute ordered list of word indices that are selected
  function getSelectedWords() {
    if (!selection) return []
    const all = TRANSCRIPT.filter(w => !deletedIds.has(w.id))
    const si = all.findIndex(w => w.id === selection.startId)
    const ei = all.findIndex(w => w.id === selection.endId)
    if (si === -1 || ei === -1) return []
    const lo = Math.min(si, ei)
    const hi = Math.max(si, ei)
    return all.slice(lo, hi + 1)
  }

  const selectedWords = getSelectedWords()
  const hasSelection  = selectedWords.length > 0

  function handleWordMouseDown(wordId) {
    setDragStart(wordId)
    setSelection({ startId: wordId, endId: wordId })
  }

  function handleWordMouseEnter(wordId) {
    if (dragStart) {
      setSelection({ startId: dragStart, endId: wordId })
    }
  }

  function handleMouseUp() {
    setDragStart(null)
  }

  function handleWordClick(word) {
    if (!dragStart) seek(word.t)
  }

  function handleRippleDelete() {
    if (!hasSelection) return
    const sorted = [...selectedWords].sort((a, b) => a.t - b.t)
    const startSec = sorted[0].t
    const endSec   = sorted[sorted.length - 1].end
    rippleDelete(startSec, endSec)
    setDeletedIds(prev => {
      const next = new Set(prev)
      sorted.forEach(w => next.add(w.id))
      return next
    })
    setSelection(null)
    setFlash(true)
    setTimeout(() => setFlash(false), 600)
  }

  const selectedSet = new Set(selectedWords.map(w => w.id))

  return (
    <div
      onMouseUp={handleMouseUp}
      style={{
        width: 220, flexShrink: 0,
        background: '#07071a',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 7,
        background: '#08081e',
      }}>
        <span style={{ fontSize: 12 }}>🤖</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.04em' }}>AI TRANSCRIPT</div>
          <div style={{ fontSize: 8, color: '#334155', marginTop: 1 }}>Click to seek · drag to select</div>
        </div>
        {hasSelection && (
          <div style={{
            fontSize: 8, color: '#818cf8', fontWeight: 700,
            background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)',
            padding: '2px 5px', borderRadius: 4,
          }}>
            {selectedWords.length}w
          </div>
        )}
      </div>

      {/* Delete CTA */}
      {hasSelection && (
        <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={handleRippleDelete}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 7,
              fontSize: 9.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'monospace',
              background: 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
              border: '1px solid rgba(239,68,68,0.35)', color: '#f87171',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <span>✂️</span> Delete from Timeline
          </button>
          <div style={{ fontSize: 7.5, color: '#334155', textAlign: 'center', marginTop: 4, lineHeight: 1.4 }}>
            {(() => {
              const sorted = [...selectedWords].sort((a, b) => a.t - b.t)
              const dur = (sorted[sorted.length - 1].end - sorted[0].t).toFixed(2)
              return `Ripple-delete ${dur}s — shifts subsequent clips`
            })()}
          </div>
        </div>
      )}

      {/* Flash confirmation */}
      {flash && (
        <div style={{
          padding: '5px 8px', background: 'rgba(52,211,153,0.1)',
          borderBottom: '1px solid rgba(52,211,153,0.2)',
          fontSize: 8.5, color: '#34d399', fontWeight: 700, textAlign: 'center',
        }}>
          ✓ Ripple delete applied
        </div>
      )}

      {/* Transcript body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
        {PARAGRAPHS.map((para, pi) => {
          const paraStart = para[0].t
          const paraActive = currentTime >= para[0].t && currentTime <= para[para.length - 1].end
          return (
            <div key={pi} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 7.5, color: '#1e3a5f', fontFamily: 'monospace',
                marginBottom: 4, letterSpacing: '0.05em',
              }}>
                {String(Math.floor(paraStart / 60)).padStart(2, '0')}:{String(Math.floor(paraStart % 60)).padStart(2, '0')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {para.filter(w => !deletedIds.has(w.id)).map(word => {
                  const isActive   = currentTime >= word.t && currentTime < word.end
                  const isSelected = selectedSet.has(word.id)
                  return (
                    <span
                      key={word.id}
                      onMouseDown={() => handleWordMouseDown(word.id)}
                      onMouseEnter={() => handleWordMouseEnter(word.id)}
                      onClick={() => handleWordClick(word)}
                      style={{
                        fontSize: 10, lineHeight: 1.5, cursor: 'pointer',
                        padding: '1px 3px', borderRadius: 3,
                        background: isSelected
                          ? 'rgba(129,140,248,0.25)'
                          : isActive
                            ? 'rgba(0,229,255,0.12)'
                            : 'transparent',
                        color: isSelected
                          ? '#c4b5fd'
                          : isActive
                            ? '#00e5ff'
                            : '#475569',
                        border: isSelected
                          ? '1px solid rgba(129,140,248,0.4)'
                          : isActive
                            ? '1px solid rgba(0,229,255,0.25)'
                            : '1px solid transparent',
                        fontWeight: isActive || isSelected ? 700 : 400,
                        transition: 'all 0.1s',
                      }}
                    >
                      {word.word}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer legend */}
      <div style={{
        padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {[
          { color: '#00e5ff', bg: 'rgba(0,229,255,0.12)', label: 'Now playing' },
          { color: '#c4b5fd', bg: 'rgba(129,140,248,0.25)', label: 'Selected' },
        ].map(({ color, bg, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: bg, border: `1px solid ${color}44` }} />
            <span style={{ fontSize: 7.5, color: '#334155' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
