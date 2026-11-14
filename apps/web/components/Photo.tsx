import { SCENES, sceneFor, type Scene } from "@spotted/tokens";
import type { Photo as CorePhoto } from "@spotted/core";

export function SceneArt({ scene, className }: { scene: Scene; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label={scene.label} width="100%" height="100%">
      {scene.shapes.map((s, i) =>
        s.t === "rect" ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={s.fill} opacity={s.o} />
        : s.t === "circle" ? <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.o} />
        : <path key={i} d={s.d} fill={s.fill} opacity={s.o} />,
      )}
    </svg>
  );
}

/** A real photo when there is one, otherwise an illustrated stand-in picked from the room's seed. */
export function Photo({ photo, seed, index = 0, alt, className, priority = false }: { photo?: CorePhoto | null; seed: string; index?: number; alt: string; className?: string; priority?: boolean }) {
  const cls = `photo ${className ?? ""}`;
  if (photo?.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={photo.url} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" />;
  }
  const scene = photo?.scene && SCENES[photo.scene as keyof typeof SCENES] ? SCENES[photo.scene as keyof typeof SCENES] : sceneFor(seed, index);
  return <div className={cls} role="img" aria-label={alt}><SceneArt scene={scene} /></div>;
}
