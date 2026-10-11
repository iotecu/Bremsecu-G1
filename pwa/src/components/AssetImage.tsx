import React, { useState, type ImgHTMLAttributes } from 'react';

export function AssetImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const [ready, setReady] = useState<string>();
  return <img {...props} decoding="async" style={{ ...props.style, visibility:ready === props.src ? 'visible':'hidden' }}
    ref={(element) => { if (element?.complete && element.naturalWidth > 0) setReady(props.src); }}
    onLoad={(event) => { const src=props.src; void event.currentTarget.decode().catch(() => undefined).then(() => setReady(src)); props.onLoad?.(event); }} />;
}
