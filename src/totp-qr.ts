import QRCode from "qrcode";

function rgbToHex(input: string, fallback: string): string {
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  const rgb = trimmed.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!rgb) return fallback;
  const hex = (value: string) => Number(value).toString(16).padStart(2, "0");
  return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
}

function readCssColor(property: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${property})`;
  document.documentElement.appendChild(probe);
  const resolved = rgbToHex(getComputedStyle(probe).color, fallback);
  probe.remove();
  return resolved;
}

export async function totpQr(otpauth: string, size = 220): Promise<string> {
  const dark = readCssColor("--accent", "#8F49DF");
  const light = readCssColor("--canvas", "#FFFEFC");
  return QRCode.toDataURL(otpauth, {
    margin: 1,
    width: size,
    color: { dark, light },
  });
}
