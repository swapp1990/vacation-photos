type PictureProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
  sizes?: string;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

export default function Picture({
  src,
  alt,
  width,
  height,
  srcSet,
  sizes,
  className,
  loading = "lazy",
  fetchPriority,
}: PictureProps) {
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      decoding="async"
      loading={loading}
      fetchPriority={fetchPriority}
      className={className}
    />
  );
}
