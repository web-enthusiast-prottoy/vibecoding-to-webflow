import type { ExternalImageService, ImageTransform, AstroConfig } from "astro";

function normalizeSrc(src: string, deployUrl?: string, mountPath?: string) {
  // For local assets, include the mount path but not the deploy url, and remove the leading slash
  if (deployUrl && src.startsWith(deployUrl)) {
    return `${src.slice(deployUrl.length)}`.slice(1);
  } else if (mountPath && src.startsWith(mountPath)) {
    return src.slice(1);
  } else if (src.startsWith("/")) {
    return `${mountPath}${src}`.slice(1);
  }
  return src;
}

// Default implementation copied from Astro's baseService
function getTargetDimensions(options: ImageTransform) {
  let targetWidth = options.width;
  let targetHeight = options.height;

  // For ESM imported images, calculate missing dimensions based on aspect ratio
  if (
    typeof options.src === "object" &&
    "width" in options.src &&
    "height" in options.src
  ) {
    const aspectRatio = options.src.width / options.src.height;
    if (targetHeight && !targetWidth) {
      targetWidth = Math.round(targetHeight * aspectRatio);
    } else if (targetWidth && !targetHeight) {
      targetHeight = Math.round(targetWidth / aspectRatio);
    } else if (!targetWidth && !targetHeight) {
      targetWidth = options.src.width;
      targetHeight = options.src.height;
    }
  }

  return {
    targetWidth,
    targetHeight,
  };
}

const cloudflareLoader: ExternalImageService = {
  getURL(options: ImageTransform, imageConfig: AstroConfig["image"]) {
    const normalizedSrc = normalizeSrc(
      typeof options.src === "object" ? options.src.src : options.src,
      imageConfig.service.config.deployUrl,
      imageConfig.service.config.mountPath
    );
    // Our cloudflare zone doesn't allow optimizing external images for security reasons, so just load the original image
    // For now, also skip optimization for images hosted on regular webflow sites (cdn.website-files.com)
    // because optimizing them would result in two bandwidth charges: one from the website-files zone (for the full image)
    // and one from the cosmic.webflow.services zone (for the resized image)
    if (
      normalizedSrc.startsWith("http://") ||
      normalizedSrc.startsWith("https://")
    ) {
      return normalizedSrc;
    }

    const supportedOptions = ["width", "height", "quality", "format"];
    const params = [];
    for (const option of supportedOptions) {
      if (options[option]) {
        params.push(`${option}=${options[option]}`);
      }
    }

    const workerUrl = imageConfig.service.config.deployUrl;
    // Skip resizing svgs, since it doesn't do anything
    const isSvg =
      typeof options.src === "object"
        ? options.src.format === "svg"
        : options.src.endsWith(".svg");
    if (isSvg || params.length === 0) {
      return `${workerUrl}/${normalizedSrc}`;
    }

    const paramsString = params.join(",");
    return `${workerUrl}/cdn-cgi/image/${paramsString}/${normalizedSrc}`;
  },

  // Default implementation copied from Astro's baseService
  getHTMLAttributes(options: ImageTransform) {
    const { targetWidth, targetHeight } = getTargetDimensions(options);
    const {
      src,
      width,
      height,
      format,
      quality,
      densities,
      widths,
      formats,
      layout,
      priority,
      fit,
      position,
      ...attributes
    } = options;

    return {
      ...attributes,
      width: targetWidth,
      height: targetHeight,
      loading: attributes.loading ?? "lazy",
      decoding: attributes.decoding ?? "async",
    };
  },
};

export default cloudflareLoader;
