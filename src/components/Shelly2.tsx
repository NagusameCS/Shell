/**
 * Shelly2 Mascot Component
 *
 * Uses the animated shelly2.svg file
 * - 2x scale with bottom 2/3 cropped (shows top portion)
 * - Bright soft blue background
 */

interface Shelly2Props {
  size?: number;
  className?: string;
}

/**
 * Shelly2 - The Shell IDE mascot
 * Displays the animated SVG mascot (cropped to show top portion)
 */
export function Shelly2({ size = 120, className = "" }: Shelly2Props) {
  // Scale the image 2x and crop bottom 2/3
  const displaySize = size;
  const imageSize = size * 2; // 2x scale
  const cropOffset = -(imageSize * 0.15); // Shift up to show interesting part
  // Shift further right to center Shelly visually
  const horizontalOffset = -(imageSize - displaySize) / 2 + (size * 0.25);

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ 
        width: displaySize, 
        height: displaySize,
      }}
    >
      <img
        src="/shelly2.svg"
        alt="Shelly - Shell IDE mascot"
        style={{ 
          width: imageSize, 
          height: imageSize,
          marginTop: cropOffset,
          marginLeft: horizontalOffset,
        }}
      />
    </div>
  );
}

/**
 * Shelly2Container - Mascot in a rounded container
 * Used on login and welcome screens
 * Features: bright soft blue background, no shadow/glow
 */
export function Shelly2Container({ size = 256 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-3xl"
      style={{ 
        width: size, 
        height: size,
        backgroundColor: "#7DD3FC", // bright soft blue (sky-300)
      }}
    >
      <Shelly2 size={size} />
    </div>
  );
}
