import { useRef, useState } from 'react'

/**
 * Placeholder vidéo landing — remplacer `src` (MP4) ou `src` URL plus tard.
 * poster : image de couverture optionnelle.
 */
export default function HomeVideo({
  src = '',
  poster = '',
  title = 'Découvrez Nolyo en quelques minutes',
}) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  function handlePlay() {
    const el = videoRef.current
    if (!el || !src) return
    el.play()
    setPlaying(true)
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-moss shadow-xl shadow-ink/15 ring-1 ring-ink/10">
      <div className="relative aspect-video w-full bg-moss">
        {src ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src={src}
            poster={poster || undefined}
            controls={playing}
            playsInline
            preload="metadata"
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            aria-label={title}
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={
              poster
                ? { backgroundImage: `url(${poster})` }
                : {
                    background:
                      'radial-gradient(40rem 24rem at 20% 20%, color-mix(in srgb, #c45c26 22%, transparent), transparent 60%), #243026',
                  }
            }
          />
        )}

        {(!src || !playing) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-moss/35 px-6 text-center">
            <button
              type="button"
              onClick={handlePlay}
              disabled={!src}
              className="grid h-16 w-16 place-items-center rounded-full bg-cream text-moss shadow-lg transition hover:scale-[1.03] disabled:cursor-default disabled:opacity-90 sm:h-18 sm:w-18"
              aria-label={src ? 'Lire la vidéo' : 'Vidéo bientôt disponible'}
            >
              <svg viewBox="0 0 24 24" className="ml-0.5 h-7 w-7" fill="currentColor" aria-hidden>
                <path d="M8.5 6.8v10.4L18 12 8.5 6.8z" />
              </svg>
            </button>
            {!src ? (
              <p className="max-w-sm text-sm text-cream/80">
                La présentation vidéo arrive bientôt. En attendant, essayez Nolyo en 5 minutes.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
